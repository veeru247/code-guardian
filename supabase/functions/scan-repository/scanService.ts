
import { ScanRequest, Secret } from "./types.ts";
import { 
  calculateSummary,
  extractRepoName
} from "./coreUtils.ts";
import { fetchRepositoryContents } from "./githubApi.ts";
import { supabase } from "./database.ts";
import { runTruffleHog } from "./truffleHogScanner.ts";
import { runGitleaks } from "./gitleaksScanner.ts";

// Main scanning service function
export async function performScan(request: ScanRequest): Promise<any> {
  const { repositoryUrl, scannerTypes, repositoryId } = request;

  // Create initial scan record with pending status
  const scanId = crypto.randomUUID();
  console.log(`Creating scan record with ID: ${scanId} for repository ${repositoryUrl}`);
  
  try {
    // If no repositoryId is provided, create a new repository record
    let repoId = repositoryId;
    if (!repoId) {
      const repoName = extractRepoName(repositoryUrl);
      const { data: repoData, error: repoError } = await supabase
        .from('repositories')
        .insert([{ 
          name: repoName,
          url: repositoryUrl,
          last_scanned_at: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (repoError) {
        console.error("Error creating repository record:", repoError);
        throw new Error(`Failed to create repository record: ${repoError.message}`);
      }
      
      repoId = repoData.id;
    }
    
    // Create initial scan record
    const { error: initialScanError } = await supabase
      .from('scan_results')
      .insert([{
        id: scanId,
        repository_id: repoId,
        status: 'pending',
        started_at: new Date().toISOString(),
        secrets: [],
        summary: {
          totalSecrets: 0,
          highSeverity: 0,
          mediumSeverity: 0,
          lowSeverity: 0,
          infoSeverity: 0
        }
      }]);
      
    if (initialScanError) {
      console.error("Error creating initial scan record:", initialScanError);
      throw new Error(`Failed to create scan record: ${initialScanError.message}`);
    }
    
    // Fetch repository contents using GitHub API
    try {
      console.log("Fetching repository contents:", repositoryUrl);
      
      // Update scan status to scanning
      await supabase
        .from('scan_results')
        .update({ status: 'scanning' })
        .eq('id', scanId);
      
      // Fetch repository files using GitHub API
      const repositoryFiles = await fetchRepositoryContents(repositoryUrl);
      console.log(`Successfully fetched ${repositoryFiles.length} files from repository`);
      
      // Run selected scanners
      const secrets: Secret[] = [];
      const scannerOptions = { 
        repositoryUrl,
        scanId,
        files: repositoryFiles
      };
      
      try {
        // Run TruffleHog if selected
        if (scannerTypes.includes('trufflehog')) {
          console.log("Running TruffleHog scanner...");
          const truffleHogSecrets = await runTruffleHog(scannerOptions);
          secrets.push(...truffleHogSecrets);
          console.log(`TruffleHog found ${truffleHogSecrets.length} secrets`);
        }
        
        // Run Gitleaks if selected
        if (scannerTypes.includes('gitleaks')) {
          console.log("Running Gitleaks scanner...");
          const gitleaksSecrets = await runGitleaks(scannerOptions);
          secrets.push(...gitleaksSecrets);
          console.log(`Gitleaks found ${gitleaksSecrets.length} secrets`);
        }
        
        // Calculate summary
        const summary = calculateSummary(secrets);
        console.log("Scan summary:", JSON.stringify(summary));
        
        // Update scan with results
        await supabase
          .from('scan_results')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            secrets: secrets,
            summary: summary,
            files: repositoryFiles
          })
          .eq('id', scanId);
        
        console.log("Scan results updated in database");
        
        // Get the updated scan result
        const { data: scanData, error: scanError } = await supabase
          .from('scan_results')
          .select('*')
          .eq('id', scanId)
          .single();
          
        if (scanError) {
          console.error("Error retrieving scan result:", scanError);
          throw new Error(`Failed to retrieve scan result: ${scanError.message}`);
        }
        
        console.log("Scan completed successfully");
        return scanData;
      } catch (error) {
        console.error("Error during scanning:", error);
        
        // Update scan status to failed
        await supabase
          .from('scan_results')
          .update({ 
            status: 'failed',
            completed_at: new Date().toISOString()
          })
          .eq('id', scanId);
        
        throw error;
      }
    } catch (error) {
      console.error("Failed to analyze repository:", error);
      
      // Update scan status to failed
      await supabase
        .from('scan_results')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', scanId);
      
      throw error;
    }
  } catch (error) {
    console.error("Error in scan service:", error);
    throw error;
  }
}

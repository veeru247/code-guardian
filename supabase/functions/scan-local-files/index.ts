
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, calculateSummary } from "./coreUtils.ts";
import { runTruffleHog } from "./truffleHogScanner.ts";
import { runGitleaks } from "./gitleaksScanner.ts";
import { supabase } from "./database.ts";
import { RepositoryFile, ScanRequest, Secret } from "./types.ts";

serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Received local file scan request");
    const requestData = await req.json();
    const { files, scannerTypes } = requestData;
    
    // Validate input
    if (!files || !Array.isArray(files) || files.length === 0) {
      return new Response(
        JSON.stringify({ error: "Files are required for scanning" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    if (!scannerTypes || !Array.isArray(scannerTypes) || scannerTypes.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one scanner type is required" }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    console.log(`Processing local scan with ${files.length} files using scanners: ${scannerTypes.join(', ')}`);
    
    // Create initial scan record with pending status
    const scanId = crypto.randomUUID();
    console.log(`Creating local scan record with ID: ${scanId}`);
    
    try {
      // Create repository record for local scans
      const { data: repoData, error: repoError } = await supabase
        .from('repositories')
        .insert([{ 
          name: `Local-Files-${new Date().toISOString().split('T')[0]}`,
          url: "local://upload",
          last_scanned_at: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (repoError) {
        console.error("Error creating repository record:", repoError);
        throw new Error(`Failed to create repository record: ${repoError.message}`);
      }
      
      const repoId = repoData.id;
      
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
      
      try {
        // Update scan status to scanning
        await supabase
          .from('scan_results')
          .update({ 
            status: 'scanning',
            files: files 
          })
          .eq('id', scanId);
        
        // Convert file format to match repository files structure
        const repositoryFiles: RepositoryFile[] = files.map((file: any) => ({
          path: file.name,
          content: file.content,
          type: 'file',
          size: file.size || file.content.length,
          lastModified: file.lastModified || new Date().toISOString()
        }));
        
        console.log(`Processing ${repositoryFiles.length} uploaded files`);
        
        // Run selected scanners
        const secrets: Secret[] = [];
        const scannerOptions = { 
          repositoryUrl: 'local://upload',
          scanId,
          files: repositoryFiles
        };
        
        try {
          // Run TruffleHog if selected
          if (scannerTypes.includes('trufflehog')) {
            console.log("Running TruffleHog scanner on local files...");
            const truffleHogSecrets = await runTruffleHog(scannerOptions);
            secrets.push(...truffleHogSecrets);
            console.log(`TruffleHog found ${truffleHogSecrets.length} secrets in local files`);
          }
          
          // Run Gitleaks if selected
          if (scannerTypes.includes('gitleaks')) {
            console.log("Running Gitleaks scanner on local files...");
            const gitleaksSecrets = await runGitleaks(scannerOptions);
            secrets.push(...gitleaksSecrets);
            console.log(`Gitleaks found ${gitleaksSecrets.length} secrets in local files`);
          }
          
          // Calculate summary
          const summary = calculateSummary(secrets);
          console.log("Local scan summary:", JSON.stringify(summary));
          
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
          
          console.log("Local scan results updated in database");
          
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
          
          console.log("Local scan completed successfully");
          return new Response(
            JSON.stringify(scanData),
            { headers: corsHeaders }
          );
        } catch (error) {
          console.error("Error during local file scanning:", error);
          
          // Update scan status to failed
          await supabase
            .from('scan_results')
            .update({ 
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: error instanceof Error ? error.message : String(error)
            })
            .eq('id', scanId);
          
          throw error;
        }
      } catch (error) {
        console.error("Failed to analyze local files:", error);
        
        // Update scan status to failed with more specific error message
        await supabase
          .from('scan_results')
          .update({ 
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : String(error)
          })
          .eq('id', scanId);
        
        throw error;
      }
    } catch (error) {
      console.error("Error in local scan service:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error processing local file scan request:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        details: error instanceof Error ? error.message : String(error),
        status: "failed",
        error_message: error instanceof Error ? error.message : String(error)
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
});

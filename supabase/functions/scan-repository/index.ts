
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Type definitions
interface Secret {
  id: string;
  scanId: string;
  filePath: string;
  lineNumber: number;
  secretType: string;
  secretValue?: string;
  commit?: string;
  author?: string;
  date?: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  description?: string;
  codeSnippet?: string;
}

interface ScanResult {
  id: string;
  repositoryId: string;
  configId: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  secrets: Secret[];
  summary: {
    totalSecrets: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    infoSeverity: number;
  };
}

// Set Supabase credentials for Edge Function
const supabaseUrl = "https://ffxgtodowddzxlqraxlt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmeGd0b2Rvd2RkenhscXJheGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1OTE4MTMsImV4cCI6MjA2MDE2NzgxM30.SsTedFa8hb1vlEGR0IYjCPAzNvLBduXnHXalWjRT0w8";

// Create Supabase client for the edge function
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Calculate summary statistics from secrets
function calculateSummary(secrets: Secret[]) {
  const counts = {
    totalSecrets: secrets.length,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    infoSeverity: 0
  };
  
  secrets.forEach(secret => {
    switch (secret.severity) {
      case 'high':
        counts.highSeverity++;
        break;
      case 'medium':
        counts.mediumSeverity++;
        break;
      case 'low':
        counts.lowSeverity++;
        break;
      case 'info':
        counts.infoSeverity++;
        break;
    }
  });
  
  return counts;
}

// Function to clone a git repository to a temporary directory
async function cloneRepository(repoUrl: string): Promise<string> {
  console.log("Starting repository clone process for:", repoUrl);
  
  // Create a temporary directory for the repo
  const tempDir = await Deno.makeTempDir();
  console.log("Created temporary directory:", tempDir);
  
  try {
    // Clone the repository with depth 1 to make it faster
    const command = new Deno.Command("git", {
      args: ["clone", "--depth", "1", repoUrl, tempDir],
    });
    
    console.log("Executing git clone command");
    const output = await command.output();
    
    if (!output.success) {
      const errorText = new TextDecoder().decode(output.stderr);
      console.error("Git clone failed:", errorText);
      throw new Error(`Failed to clone repository: ${errorText}`);
    }
    
    console.log("Repository cloned successfully to:", tempDir);
    return tempDir;
  } catch (error) {
    console.error("Exception during git clone:", error);
    throw error;
  }
}

// Function to run TruffleHog scanner
async function runTruffleHog(repoPath: string): Promise<Secret[]> {
  console.log("Starting TruffleHog scan on repository:", repoPath);
  const secrets: Secret[] = [];
  
  try {
    // Check if trufflehog is installed
    try {
      const versionCommand = new Deno.Command("trufflehog", {
        args: ["--version"],
      });
      const versionOutput = await versionCommand.output();
      if (versionOutput.success) {
        console.log("TruffleHog version:", new TextDecoder().decode(versionOutput.stdout));
      } else {
        console.error("TruffleHog version check failed:", new TextDecoder().decode(versionOutput.stderr));
      }
    } catch (err) {
      console.error("Error checking TruffleHog version:", err);
    }
    
    // Run trufflehog on the cloned repository
    console.log("Executing TruffleHog command");
    const command = new Deno.Command("trufflehog", {
      args: ["filesystem", "--directory", repoPath, "--json"],
    });
    
    const output = await command.output();
    
    if (!output.success) {
      console.error("TruffleHog scan failed:", new TextDecoder().decode(output.stderr));
      return secrets;
    }
    
    const stdout = new TextDecoder().decode(output.stdout);
    console.log("TruffleHog raw output:", stdout.substring(0, 200) + (stdout.length > 200 ? "..." : ""));
    
    // Process each line of output as a separate JSON object
    const lines = stdout.trim().split("\n");
    console.log(`TruffleHog found ${lines.length} potential secrets`);
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const result = JSON.parse(line);
        
        // Map TruffleHog result to our Secret format
        secrets.push({
          id: crypto.randomUUID(),
          scanId: "", // Will be set later
          filePath: result.source.file || "Unknown file",
          lineNumber: result.source.line || 0,
          secretType: result.detector.detectorType || "Unknown",
          severity: determineSeverity(result.detector.detectorType),
          description: `Found ${result.detector.detectorType} secret`,
          codeSnippet: result.raw || "",
          commit: result.source.commit || "",
          author: result.source.email || "",
          date: result.source.timestamp || ""
        });
      } catch (err) {
        console.error("Error parsing TruffleHog output:", err, "Line:", line);
      }
    }
    
    console.log(`Successfully processed ${secrets.length} secrets from TruffleHog`);
  } catch (error) {
    console.error("Error running TruffleHog:", error);
  }
  
  return secrets;
}

// Function to run Gitleaks scanner
async function runGitleaks(repoPath: string): Promise<Secret[]> {
  console.log("Starting Gitleaks scan on repository:", repoPath);
  const secrets: Secret[] = [];
  
  try {
    // Check if gitleaks is installed
    try {
      const versionCommand = new Deno.Command("gitleaks", {
        args: ["version"],
      });
      const versionOutput = await versionCommand.output();
      if (versionOutput.success) {
        console.log("Gitleaks version:", new TextDecoder().decode(versionOutput.stdout));
      } else {
        console.error("Gitleaks version check failed:", new TextDecoder().decode(versionOutput.stderr));
      }
    } catch (err) {
      console.error("Error checking Gitleaks version:", err);
    }
    
    // Run gitleaks on the cloned repository
    console.log("Executing Gitleaks command");
    const command = new Deno.Command("gitleaks", {
      args: ["detect", "--source", repoPath, "--report-format", "json", "--no-git"],
    });
    
    const output = await command.output();
    
    if (!output.success) {
      console.error("Gitleaks scan failed:", new TextDecoder().decode(output.stderr));
      return secrets;
    }
    
    const stdout = new TextDecoder().decode(output.stdout);
    console.log("Gitleaks raw output:", stdout.substring(0, 200) + (stdout.length > 200 ? "..." : ""));
    
    try {
      // Gitleaks outputs a single JSON array, unlike TruffleHog which outputs one JSON object per line
      const results = JSON.parse(stdout);
      console.log(`Gitleaks found ${results.length} potential secrets`);
      
      for (const result of results) {
        // Map Gitleaks result to our Secret format
        secrets.push({
          id: crypto.randomUUID(),
          scanId: "", // Will be set later
          filePath: result.file || "Unknown file",
          lineNumber: result.startLine || 0,
          secretType: result.ruleID || "Unknown",
          severity: determineSeverity(result.ruleID),
          description: result.description || `Found ${result.ruleID} secret`,
          codeSnippet: result.match || "",
          commit: result.commit || "",
          author: result.author || "",
          date: result.date || ""
        });
      }
      
      console.log(`Successfully processed ${secrets.length} secrets from Gitleaks`);
    } catch (err) {
      console.error("Error parsing Gitleaks output:", err);
    }
  } catch (error) {
    console.error("Error running Gitleaks:", error);
  }
  
  return secrets;
}

// Determine severity based on secret type
function determineSeverity(secretType: string): 'high' | 'medium' | 'low' | 'info' {
  // Define high severity secret types
  const highSeverityTypes = [
    'AWS', 'ApiKey', 'PrivateKey', 'Token', 'Password', 'Secret', 'Credential',
    'Authorization', 'OAuth', 'Key', 'Certificate', 'SSH', 'PGP', 'RSA'
  ];
  
  // Define medium severity secret types
  const mediumSeverityTypes = [
    'Connection', 'Database', 'Config', 'Environment', 'Email'
  ];
  
  // Check if the secretType contains any high severity keywords
  for (const type of highSeverityTypes) {
    if (secretType.toLowerCase().includes(type.toLowerCase())) {
      return 'high';
    }
  }
  
  // Check if the secretType contains any medium severity keywords
  for (const type of mediumSeverityTypes) {
    if (secretType.toLowerCase().includes(type.toLowerCase())) {
      return 'medium';
    }
  }
  
  // Default to low severity
  return 'low';
}

// Main handler function
serve(async (req) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
    "Content-Type": "application/json"
  };

  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  try {
    console.log("Received scan request");
    const { repositoryUrl, scannerTypes } = await req.json();
    
    if (!repositoryUrl) {
      return new Response(
        JSON.stringify({ error: "Repository URL is required" }),
        { headers, status: 400 }
      );
    }

    if (!scannerTypes || !Array.isArray(scannerTypes) || scannerTypes.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one scanner type is required" }),
        { headers, status: 400 }
      );
    }

    console.log(`Processing scan for repo: ${repositoryUrl} with scanners: ${scannerTypes.join(', ')}`);
    
    // Extract repository name from URL
    const repoName = repositoryUrl.split('/').pop()?.replace('.git', '') || 'unknown-repo';
    
    // Create a repository record
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
      return new Response(
        JSON.stringify({ error: "Failed to create repository record", details: repoError }),
        { headers, status: 500 }
      );
    }
    
    // Create initial scan record with pending status
    const scanId = crypto.randomUUID();
    const { error: initialScanError } = await supabase
      .from('scan_results')
      .insert([{
        id: scanId,
        repository_id: repoData.id,
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
      return new Response(
        JSON.stringify({ error: "Failed to create scan record", details: initialScanError }),
        { headers, status: 500 }
      );
    }
    
    console.log(`Created scan record with ID: ${scanId}`);
    
    // Clone the repository asynchronously
    let repoPath: string;
    try {
      console.log("Cloning repository:", repositoryUrl);
      repoPath = await cloneRepository(repositoryUrl);
      console.log("Repository cloned successfully to:", repoPath);
      
      // Update scan status to scanning
      await supabase
        .from('scan_results')
        .update({ status: 'scanning' })
        .eq('id', scanId);
    } catch (error) {
      console.error("Failed to clone repository:", error);
      
      // Update scan status to failed
      await supabase
        .from('scan_results')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', scanId);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to clone repository", 
          details: error instanceof Error ? error.message : String(error) 
        }),
        { headers, status: 500 }
      );
    }
    
    // Run selected scanners
    const secrets: Secret[] = [];
    
    try {
      // Run TruffleHog if selected
      if (scannerTypes.includes('trufflehog')) {
        console.log("Running TruffleHog scanner...");
        const truffleHogSecrets = await runTruffleHog(repoPath);
        truffleHogSecrets.forEach(secret => {
          secret.scanId = scanId;
          secrets.push(secret);
        });
        console.log(`TruffleHog found ${truffleHogSecrets.length} secrets`);
      }
      
      // Run Gitleaks if selected
      if (scannerTypes.includes('gitleaks')) {
        console.log("Running Gitleaks scanner...");
        const gitleaksSecrets = await runGitleaks(repoPath);
        gitleaksSecrets.forEach(secret => {
          secret.scanId = scanId;
          secrets.push(secret);
        });
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
          summary: summary
        })
        .eq('id', scanId);
      
      console.log("Scan results updated in database");
      
      // Clean up - remove temporary directory
      try {
        await Deno.remove(repoPath, { recursive: true });
        console.log("Temporary directory cleaned up");
      } catch (cleanupError) {
        console.error("Error cleaning up repository:", cleanupError);
      }
      
      // Get the updated scan result
      const { data: scanData, error: scanError } = await supabase
        .from('scan_results')
        .select('*')
        .eq('id', scanId)
        .single();
        
      if (scanError) {
        console.error("Error retrieving scan result:", scanError);
        return new Response(
          JSON.stringify({ error: "Failed to retrieve scan result", details: scanError }),
          { headers, status: 500 }
        );
      }
      
      console.log("Scan completed successfully");
      // Return the scan result
      return new Response(JSON.stringify(scanData), { headers });
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
      
      // Clean up - remove temporary directory
      try {
        await Deno.remove(repoPath, { recursive: true });
      } catch (cleanupError) {
        console.error("Error cleaning up repository:", cleanupError);
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Error during scanning", 
          details: error instanceof Error ? error.message : String(error) 
        }),
        { headers, status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { headers, status: 500 }
    );
  }
});

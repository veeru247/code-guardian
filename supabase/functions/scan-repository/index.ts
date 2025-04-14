
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
type ScannerType = 'trufflehog' | 'gitleaks' | 'custom';
type SecretSeverity = 'high' | 'medium' | 'low' | 'info';

interface Secret {
  id: string;
  scanId: string;
  filePath: string;
  lineNumber: number;
  secretType: string;
  commit?: string;
  author?: string;
  date?: string;
  severity: SecretSeverity;
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

interface ScanRequest {
  repositoryUrl: string;
  scannerTypes: ScannerType[];
}

// Helper function to generate a random ID
function generateId(): string {
  return crypto.randomUUID();
}

// Helper to run shell commands
async function runCommand(cmd: string[]): Promise<string> {
  const command = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "piped",
    stderr: "piped",
  });
  
  const { stdout, stderr } = await command.output();
  
  if (stderr.length > 0) {
    console.error(new TextDecoder().decode(stderr));
  }
  
  return new TextDecoder().decode(stdout);
}

// Clone repository to a temporary directory
async function cloneRepo(repoUrl: string): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  try {
    await runCommand(["git", "clone", "--depth", "1", repoUrl, tempDir]);
    return tempDir;
  } catch (error) {
    console.error(`Error cloning repository: ${error}`);
    throw new Error(`Failed to clone repository: ${error.message}`);
  }
}

// Execute trufflehog scan
async function runTrufflehog(repoPath: string, scanId: string): Promise<Secret[]> {
  try {
    // Check if trufflehog is available
    try {
      await runCommand(["trufflehog", "--version"]);
    } catch (error) {
      console.error("Trufflehog not installed or not in PATH");
      return [];
    }
    
    // Run trufflehog with JSON output
    const output = await runCommand([
      "trufflehog", 
      "filesystem", 
      "--directory", 
      repoPath,
      "--json"
    ]);
    
    // Parse results
    const secrets: Secret[] = [];
    const lines = output.trim().split("\n");
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const result = JSON.parse(line);
        const severity = determineSeverity(result.DetectorType);
        
        secrets.push({
          id: generateId(),
          scanId,
          filePath: result.SourceMetadata.Data.Filesystem.file || "Unknown",
          lineNumber: result.SourceMetadata.Data.Filesystem.Line || 0,
          secretType: `trufflehog: ${result.DetectorType}`,
          severity,
          description: `TruffleHog found a ${result.DetectorType} in repository`,
          codeSnippet: result.Raw || "Code snippet not available"
        });
      } catch (error) {
        console.error(`Error parsing trufflehog result: ${error}`);
      }
    }
    
    return secrets;
  } catch (error) {
    console.error(`Error running trufflehog: ${error}`);
    return [];
  }
}

// Execute gitleaks scan
async function runGitleaks(repoPath: string, scanId: string): Promise<Secret[]> {
  try {
    // Check if gitleaks is available
    try {
      await runCommand(["gitleaks", "version"]);
    } catch (error) {
      console.error("Gitleaks not installed or not in PATH");
      return [];
    }
    
    // Run gitleaks with JSON output
    const output = await runCommand([
      "gitleaks", 
      "detect", 
      "--source", 
      repoPath,
      "--report-format", 
      "json"
    ]);
    
    // Parse results
    const secrets: Secret[] = [];
    
    if (output.trim()) {
      try {
        const results = JSON.parse(output);
        
        for (const result of results) {
          const severity = determineSeverity(result.RuleID);
          
          secrets.push({
            id: generateId(),
            scanId,
            filePath: result.File || "Unknown",
            lineNumber: result.StartLine || 0,
            secretType: `gitleaks: ${result.RuleID}`,
            commit: result.Commit || undefined,
            author: result.Author || undefined,
            date: result.Date || undefined,
            severity,
            description: result.Description || `Gitleaks found a ${result.RuleID} in repository`,
            codeSnippet: result.Secret || "Code snippet not available"
          });
        }
      } catch (error) {
        console.error(`Error parsing gitleaks result: ${error}`);
      }
    }
    
    return secrets;
  } catch (error) {
    console.error(`Error running gitleaks: ${error}`);
    return [];
  }
}

// Execute custom scan (placeholder for custom scanning logic)
async function runCustomScan(repoPath: string, scanId: string): Promise<Secret[]> {
  // This is a placeholder for custom scanning logic
  // In a real implementation, you'd run your custom tool or script here
  
  const secrets: Secret[] = [];
  
  // Example: Scan for hardcoded passwords in files
  try {
    const command = new Deno.Command("grep", {
      args: ["-r", "password", "--include=*.{js,ts,tsx,jsx,json,yml,yaml}", repoPath],
      stdout: "piped",
      stderr: "piped",
    });
    
    const { stdout } = await command.output();
    const output = new TextDecoder().decode(stdout);
    
    const lines = output.trim().split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const [filePath, ...contentParts] = line.split(":");
      const content = contentParts.join(":");
      
      // Simple rule to detect potential password
      if (content.match(/password.*=.*["'].*["']/i)) {
        secrets.push({
          id: generateId(),
          scanId,
          filePath: filePath.replace(repoPath + "/", ""),
          lineNumber: 0, // In a real implementation, you'd extract the line number
          secretType: "custom: Potential hardcoded password",
          severity: "medium",
          description: "Custom scan found a potential hardcoded password",
          codeSnippet: content.trim()
        });
      }
    }
  } catch (error) {
    console.error(`Error running custom scan: ${error}`);
  }
  
  return secrets;
}

// Determine severity based on secret type
function determineSeverity(secretType: string): SecretSeverity {
  // High severity secrets
  if (secretType.match(/AWS|api[_\s]?key|token|password|credential|secret|private[_\s]?key|ssh/i)) {
    return "high";
  }
  
  // Medium severity secrets
  if (secretType.match(/auth|oauth|basic[_\s]?auth|bearer/i)) {
    return "medium";
  }
  
  // Low severity secrets
  if (secretType.match(/config|setting|env/i)) {
    return "low";
  }
  
  // Default to info
  return "info";
}

// Count secrets by severity
function countSecretsBySeverity(secrets: Secret[]) {
  const counts = {
    totalSecrets: secrets.length,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    infoSeverity: 0
  };
  
  for (const secret of secrets) {
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
  }
  
  return counts;
}

// Main handler function
serve(async (req) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
  };

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }
  
  try {
    // Get request data
    const data: ScanRequest = await req.json();
    const { repositoryUrl, scannerTypes } = data;
    
    if (!repositoryUrl) {
      return new Response(
        JSON.stringify({ error: "Repository URL is required" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
    
    // Create scan result object
    const scanId = generateId();
    const startTime = new Date().toISOString();
    
    // Clone repository
    console.log(`Cloning repository: ${repositoryUrl}`);
    let repoPath;
    try {
      repoPath = await cloneRepo(repositoryUrl);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: `Failed to clone repository: ${error.message}` }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }
    
    try {
      // Run selected scanners
      let allSecrets: Secret[] = [];
      
      for (const scannerType of scannerTypes) {
        console.log(`Running ${scannerType} scan`);
        
        let secrets: Secret[] = [];
        switch (scannerType) {
          case 'trufflehog':
            secrets = await runTrufflehog(repoPath, scanId);
            break;
          case 'gitleaks':
            secrets = await runGitleaks(repoPath, scanId);
            break;
          case 'custom':
            secrets = await runCustomScan(repoPath, scanId);
            break;
        }
        
        console.log(`Found ${secrets.length} secrets with ${scannerType}`);
        allSecrets = [...allSecrets, ...secrets];
      }
      
      // Clean up - remove temp directory
      try {
        await Deno.remove(repoPath, { recursive: true });
      } catch (error) {
        console.error(`Error cleaning up temp directory: ${error}`);
      }
      
      // Create final scan result
      const summary = countSecretsBySeverity(allSecrets);
      
      const scanResult: ScanResult = {
        id: scanId,
        repositoryId: repositoryUrl,
        configId: generateId(),
        status: 'completed',
        startedAt: startTime,
        completedAt: new Date().toISOString(),
        secrets: allSecrets,
        summary
      };
      
      return new Response(
        JSON.stringify(scanResult),
        { headers: { ...headers, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error(`Error during scan: ${error}`);
      
      return new Response(
        JSON.stringify({ error: `Scan failed: ${error.message}` }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    } finally {
      // Make sure we clean up the temp directory even if there's an error
      if (repoPath) {
        try {
          await Deno.remove(repoPath, { recursive: true });
        } catch (cleanupError) {
          console.error(`Error during cleanup: ${cleanupError}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing request: ${error}`);
    
    return new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});

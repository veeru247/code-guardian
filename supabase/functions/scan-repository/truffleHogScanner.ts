
import { Secret, ScannerOptions } from "./types.ts";
import { determineSeverity } from "./utils.ts";

// Function to run TruffleHog scanner
export async function runTruffleHog(options: ScannerOptions): Promise<Secret[]> {
  const { repoPath, scanId } = options;
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
    console.log("TruffleHog raw output length:", stdout.length);
    console.log("TruffleHog raw output preview:", stdout.substring(0, 200) + (stdout.length > 200 ? "..." : ""));
    
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
          scanId: scanId || "",
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

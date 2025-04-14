
import { Secret, ScannerOptions } from "./types.ts";
import { determineSeverity } from "./utils.ts";

// Function to run Gitleaks scanner
export async function runGitleaks(options: ScannerOptions): Promise<Secret[]> {
  const { repoPath, scanId } = options;
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
    console.log("Gitleaks raw output length:", stdout.length);
    console.log("Gitleaks raw output preview:", stdout.substring(0, 200) + (stdout.length > 200 ? "..." : ""));
    
    try {
      // Gitleaks outputs a single JSON array, unlike TruffleHog which outputs one JSON object per line
      const results = JSON.parse(stdout);
      console.log(`Gitleaks found ${results.length} potential secrets`);
      
      for (const result of results) {
        // Map Gitleaks result to our Secret format
        secrets.push({
          id: crypto.randomUUID(),
          scanId: scanId || "",
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

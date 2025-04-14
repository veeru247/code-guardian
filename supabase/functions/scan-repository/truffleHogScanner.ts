
import { Secret, ScannerOptions } from "./types.ts";
import { analyzeContentForSecrets, fetchCommonRepositoryFiles } from "./utils.ts";

// TruffleHog scanner simulation
export async function runTruffleHog(options: ScannerOptions): Promise<Secret[]> {
  const { scanId, repositoryUrl } = options;
  console.log("Running TruffleHog scanner simulation for:", repositoryUrl);
  
  try {
    // Simulate TruffleHog scanning by analyzing fetched repository files
    const files = await fetchCommonRepositoryFiles(repositoryUrl);
    const secrets: Secret[] = [];
    
    // Custom TruffleHog patterns
    const truffleHogPatterns = [
      {
        name: "TruffleHog - AWS Access Key",
        regex: /AKIA[0-9A-Z]{16}/,
        severity: "high" as const,
        description: "TruffleHog detected AWS Access Key"
      },
      {
        name: "TruffleHog - API Token",
        regex: /(api|app)_(token|key|secret)[\"\'=:\s]+([a-zA-Z0-9_\-\.]{16,})/i,
        severity: "medium" as const,
        description: "TruffleHog detected API token/key"
      },
      {
        name: "TruffleHog - Password in Code",
        regex: /(password|passwd|pwd)[\"\'=:\s]+([a-zA-Z0-9_\-\.!@#$%^&*]{8,})/i,
        severity: "high" as const,
        description: "TruffleHog detected password in code"
      }
    ];
    
    // Process each file with TruffleHog-specific logic
    for (const file of files) {
      const lines = file.content.split('\n');
      
      lines.forEach((line, index) => {
        // TruffleHog-specific detection logic
        const fileSecrets = analyzeContentForSecrets(
          line,
          file.path,
          index + 1,
          scanId || crypto.randomUUID(),
          truffleHogPatterns
        );
        
        // Mark as TruffleHog findings
        fileSecrets.forEach(secret => {
          secret.secretType = `TruffleHog: ${secret.secretType}`;
        });
        
        secrets.push(...fileSecrets);
      });
    }
    
    console.log(`TruffleHog simulation found ${secrets.length} secrets`);
    
    // Return the discovered secrets
    return secrets;
  } catch (error) {
    console.error("Error in TruffleHog scanner:", error);
    throw new Error(`TruffleHog scanner error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

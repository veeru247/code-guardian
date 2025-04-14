
import { Secret, ScannerOptions } from "./types.ts";
import { analyzeContentForSecrets, fetchCommonRepositoryFiles } from "./utils.ts";

// Gitleaks scanner simulation
export async function runGitleaks(options: ScannerOptions): Promise<Secret[]> {
  const { scanId, repositoryUrl } = options;
  console.log("Running Gitleaks scanner simulation for:", repositoryUrl);
  
  try {
    // Simulate Gitleaks scanning by analyzing fetched repository files
    const files = await fetchCommonRepositoryFiles(repositoryUrl);
    const secrets: Secret[] = [];
    
    // Custom Gitleaks-specific patterns
    const gitleaksPatterns = [
      {
        name: "Gitleaks - Private Key",
        regex: /-----BEGIN ([A-Z]+ )?PRIVATE KEY( BLOCK)?-----/,
        severity: "high" as const,
        description: "Gitleaks detected a private key"
      },
      {
        name: "Gitleaks - GitHub Token",
        regex: /gh[pousr]_[a-zA-Z0-9]{36}/,
        severity: "high" as const,
        description: "Gitleaks detected GitHub token"
      },
      {
        name: "Gitleaks - Connection String",
        regex: /[a-zA-Z]+:\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+@[a-zA-Z0-9_.-]+/,
        severity: "medium" as const,
        description: "Gitleaks detected connection string"
      }
    ];
    
    // Process each file with Gitleaks-specific logic
    for (const file of files) {
      const lines = file.content.split('\n');
      
      lines.forEach((line, index) => {
        // Gitleaks-specific detection logic
        const fileSecrets = analyzeContentForSecrets(
          line,
          file.path,
          index + 1,
          scanId || crypto.randomUUID(),
          gitleaksPatterns
        );
        
        // Mark as Gitleaks findings
        fileSecrets.forEach(secret => {
          secret.secretType = `Gitleaks: ${secret.secretType}`;
        });
        
        secrets.push(...fileSecrets);
      });
    }
    
    console.log(`Gitleaks simulation found ${secrets.length} secrets`);
    
    // Return the discovered secrets
    return secrets;
  } catch (error) {
    console.error("Error in Gitleaks scanner:", error);
    throw new Error(`Gitleaks scanner error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

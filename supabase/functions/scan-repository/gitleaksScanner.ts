
import { Secret, ScannerOptions } from "./types.ts";
import { scanFileForSecrets } from "./secretPatterns.ts";
import { gitleaksPatterns } from "./secretPatterns.ts";

// Gitleaks scanner implementation
export async function runGitleaks(options: ScannerOptions): Promise<Secret[]> {
  const { scanId, repositoryUrl, files } = options;
  console.log(`Running Gitleaks scanner on ${files.length} files from: ${repositoryUrl}`);
  
  const secrets: Secret[] = [];
  
  try {
    // Process each file with Gitleaks patterns
    for (const file of files) {
      if (file.type === 'file' && file.content) {
        const fileSecrets = scanFileForSecrets(file, scanId || crypto.randomUUID(), gitleaksPatterns);
        
        // Mark as Gitleaks findings
        fileSecrets.forEach(secret => {
          // Extract commit info if available
          // In a real integration, we would get this from git history
          secret.commit = "HEAD";
          secret.author = "Repository Owner";
          secret.date = new Date().toISOString();
        });
        
        secrets.push(...fileSecrets);
      }
    }
    
    console.log(`Gitleaks scanner found ${secrets.length} secrets`);
    return secrets;
  } catch (error) {
    console.error("Error in Gitleaks scanner:", error);
    throw new Error(`Gitleaks scanner error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

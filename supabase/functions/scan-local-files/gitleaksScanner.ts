
import { Secret, ScannerOptions } from "./types.ts";
import { scanFileForSecrets } from "./secretPatterns.ts";
import { gitleaksPatterns } from "./secretPatterns.ts";

// Improved Gitleaks scanner implementation
export async function runGitleaks(options: ScannerOptions): Promise<Secret[]> {
  const { scanId, repositoryUrl, files } = options;
  console.log(`Running Gitleaks scanner on ${files.length} files from: ${repositoryUrl}`);
  
  const secrets: Secret[] = [];
  
  try {
    // Process each file with Gitleaks patterns
    for (const file of files) {
      if (file.type === 'file' && file.content) {
        console.log(`Gitleaks processing file: ${file.path} (content length: ${file.content.length} bytes)`);
        
        const fileSecrets = scanFileForSecrets(file, scanId || crypto.randomUUID(), gitleaksPatterns);
        
        // Mark as Gitleaks findings
        fileSecrets.forEach(secret => {
          // Extract commit info if available
          secret.commit = "HEAD";
          secret.author = "File Owner";
          secret.date = new Date().toISOString();
          
          console.log(`Gitleaks found secret: ${secret.secretType} in ${secret.filePath}:${secret.lineNumber}`);
        });
        
        secrets.push(...fileSecrets);
      } else {
        console.log(`Gitleaks skipped file ${file.path}: type=${file.type}, has content=${!!file.content}`);
      }
    }
    
    console.log(`Gitleaks scanner completed. Found ${secrets.length} secrets in total.`);
    return secrets;
  } catch (error) {
    console.error("Error in Gitleaks scanner:", error);
    throw new Error(`Gitleaks scanner error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

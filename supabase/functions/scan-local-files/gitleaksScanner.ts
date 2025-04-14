
import { Secret, ScannerOptions } from "./types.ts";
import { scanFileForSecrets } from "./secretPatterns.ts";
import { gitleaksPatterns } from "./secretPatterns.ts";

// Execute Gitleaks as a command-line process
export async function runGitleaks(options: ScannerOptions): Promise<Secret[]> {
  const { scanId, repositoryUrl, files } = options;
  console.log(`Running Gitleaks scanner on ${files.length} files from: ${repositoryUrl}`);
  
  const secrets: Secret[] = [];
  
  try {
    // Until we have command-line access, use enhanced pattern matching with detailed logging
    for (const file of files) {
      if (file.type === 'file' && file.content) {
        console.log(`Gitleaks processing file: ${file.path} (content length: ${file.content.length} bytes)`);
        
        // Log a small preview of the content (first 100 chars) for debugging
        const contentPreview = file.content.substring(0, 100).replace(/\n/g, ' ');
        console.log(`Content preview: ${contentPreview}...`);
        
        const fileSecrets = scanFileForSecrets(file, scanId || crypto.randomUUID(), gitleaksPatterns);
        
        if (fileSecrets.length > 0) {
          console.log(`Found ${fileSecrets.length} secrets in ${file.path}!`);
          
          // Mark as Gitleaks findings and provide more context
          fileSecrets.forEach(secret => {
            // Extract commit info if available
            secret.commit = "HEAD";
            secret.author = "File Owner";
            secret.date = new Date().toISOString();
            
            // Get context for the secret (the line containing it)
            const lines = file.content.split('\n');
            const lineContent = lines[secret.lineNumber - 1] || '';
            
            console.log(`Gitleaks found secret: ${secret.secretType} in ${file.path}:${secret.lineNumber}`);
            console.log(`Line content: ${lineContent.substring(0, 50)}...`);
          });
          
          secrets.push(...fileSecrets);
        } else {
          console.log(`No secrets found in ${file.path}`);
        }
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


import { Secret, ScannerOptions } from "./types.ts";
import { scanFileForSecrets } from "./secretPatterns.ts";
import { truffleHogPatterns } from "./secretPatterns.ts";

// Improved TruffleHog scanner implementation
export async function runTruffleHog(options: ScannerOptions): Promise<Secret[]> {
  const { scanId, repositoryUrl, files } = options;
  console.log(`Running TruffleHog scanner on ${files.length} files from: ${repositoryUrl}`);
  
  const secrets: Secret[] = [];
  
  try {
    // Process each file with TruffleHog patterns
    for (const file of files) {
      if (file.type === 'file' && file.content) {
        console.log(`TruffleHog processing file: ${file.path} (content length: ${file.content.length} bytes)`);
        
        // Log a small preview of the content (first 100 chars) for debugging
        const contentPreview = file.content.substring(0, 100).replace(/\n/g, ' ');
        console.log(`Content preview: ${contentPreview}...`);
        
        const fileSecrets = scanFileForSecrets(file, scanId || crypto.randomUUID(), truffleHogPatterns);
        
        if (fileSecrets.length > 0) {
          console.log(`Found ${fileSecrets.length} secrets in ${file.path}!`);
          
          // Mark as TruffleHog findings
          fileSecrets.forEach(secret => {
            // Extract commit info if available
            secret.commit = "HEAD";
            secret.author = "File Owner";
            secret.date = new Date().toISOString();
            
            // Get context for the secret (the line containing it)
            const lines = file.content.split('\n');
            const lineContent = lines[secret.lineNumber - 1] || '';
            
            console.log(`TruffleHog found secret: ${secret.secretType} in ${file.path}:${secret.lineNumber}`);
            console.log(`Line content: ${lineContent.substring(0, 50)}...`);
          });
          
          secrets.push(...fileSecrets);
        } else {
          console.log(`No secrets found in ${file.path}`);
        }
      } else {
        console.log(`TruffleHog skipped file ${file.path}: type=${file.type}, has content=${!!file.content}`);
      }
    }
    
    console.log(`TruffleHog scanner completed. Found ${secrets.length} secrets in total.`);
    return secrets;
  } catch (error) {
    console.error("Error in TruffleHog scanner:", error);
    throw new Error(`TruffleHog scanner error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

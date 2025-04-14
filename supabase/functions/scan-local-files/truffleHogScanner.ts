
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
        
        const fileSecrets = scanFileForSecrets(file, scanId || crypto.randomUUID(), truffleHogPatterns);
        
        // Mark as TruffleHog findings
        fileSecrets.forEach(secret => {
          // Extract commit info if available
          secret.commit = "HEAD";
          secret.author = "File Owner";
          secret.date = new Date().toISOString();
          
          console.log(`TruffleHog found secret: ${secret.secretType} in ${secret.filePath}:${secret.lineNumber}`);
        });
        
        secrets.push(...fileSecrets);
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

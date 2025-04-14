
import { Secret, ScannerOptions } from "./types.ts";
import { scanFileForSecrets, truffleHogPatterns } from "./utils.ts";

// TruffleHog scanner implementation
export async function runTruffleHog(options: ScannerOptions): Promise<Secret[]> {
  const { scanId, repositoryUrl, files } = options;
  console.log(`Running TruffleHog scanner on ${files.length} files from: ${repositoryUrl}`);
  
  const secrets: Secret[] = [];
  
  try {
    // Process each file with TruffleHog patterns
    for (const file of files) {
      if (file.type === 'file' && file.content) {
        const fileSecrets = scanFileForSecrets(file, scanId || crypto.randomUUID(), truffleHogPatterns);
        
        // Mark as TruffleHog findings
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
    
    console.log(`TruffleHog scanner found ${secrets.length} secrets`);
    return secrets;
  } catch (error) {
    console.error("Error in TruffleHog scanner:", error);
    throw new Error(`TruffleHog scanner error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

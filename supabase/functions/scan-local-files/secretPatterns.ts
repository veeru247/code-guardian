
// Secret scanning pattern definitions and detection logic
import { Secret, SecretPattern, RepositoryFile } from "./types.ts";

// TruffleHog secret detection patterns - enhanced for better detection
export const truffleHogPatterns: SecretPattern[] = [
  {
    name: "TruffleHog - AWS Access Key",
    regex: /AKIA[0-9A-Z]{16}/g,
    severity: "high",
    description: "AWS Access Key ID found"
  },
  {
    name: "TruffleHog - AWS Secret Key",
    regex: /([^A-Za-z0-9/+=]|^)[A-Za-z0-9/+=]{40}([^A-Za-z0-9/+=]|$)/g,
    severity: "high",
    description: "Potential AWS Secret Access Key"
  },
  {
    name: "TruffleHog - API Token",
    regex: /(api|app)_(token|key|secret)[\"\'=:\s]+([a-zA-Z0-9_\-\.]{16,})/gi,
    severity: "medium",
    description: "API token/key detected"
  },
  {
    name: "TruffleHog - Generic Secret",
    regex: /(secret|token|password|passwd|pwd|api_?key|access_?key)[\"\'`=:\s]+([a-zA-Z0-9_\-\.!@#$%^&*]{8,})/gi,
    severity: "medium",
    description: "Generic secret detected"
  },
  {
    name: "TruffleHog - Private Key",
    regex: /-----BEGIN [A-Z]+ PRIVATE KEY-----/g,
    severity: "high",
    description: "Cryptographic private key"
  },
  {
    name: "TruffleHog - Connection String",
    regex: /[a-zA-Z]+:\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+@[a-zA-Z0-9_.-]+/g,
    severity: "medium",
    description: "Database connection string"
  },
  {
    name: "TruffleHog - GitHub Token",
    regex: /gh[pousr]_[a-zA-Z0-9]{36}/g,
    severity: "high",
    description: "GitHub Personal Access Token"
  },
  {
    name: "TruffleHog - Environment Variable",
    regex: /([A-Za-z0-9_]+)=(["'][^"']+["']|[^"'\s]+)/g,
    severity: "info",
    description: "Environment variable definition"
  }
];

// Gitleaks secret detection patterns - enhanced for better detection
export const gitleaksPatterns: SecretPattern[] = [
  {
    name: "Gitleaks - GitHub Token",
    regex: /gh[pousr]_[a-zA-Z0-9]{36}/g,
    severity: "high",
    description: "GitHub Personal Access Token"
  },
  {
    name: "Gitleaks - Private Key",
    regex: /-----BEGIN ([A-Z]+ )?PRIVATE KEY( BLOCK)?-----/g,
    severity: "high",
    description: "Gitleaks detected a private key"
  },
  {
    name: "Gitleaks - Connection String",
    regex: /[a-zA-Z]+:\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+@[a-zA-Z0-9_.-]+/g,
    severity: "medium",
    description: "Connection string detected"
  },
  {
    name: "Gitleaks - JWT Token",
    regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
    severity: "medium",
    description: "JWT token detected"
  },
  {
    name: "Gitleaks - Authorization Header",
    regex: /Authorization['":\s]*Bearer\s+[a-zA-Z0-9_\-.~+\/]+={0,2}/gi,
    severity: "high",
    description: "Authorization header with bearer token"
  },
  {
    name: "Gitleaks - Generic API Key",
    regex: /[a-zA-Z0-9_-]*(api[_-]?key|apikey|api_token)[\"\'=:\s]+([a-zA-Z0-9_\-\.]{16,})/gi,
    severity: "medium",
    description: "Generic API key detected"
  },
  {
    name: "Gitleaks - Secret Key/Value",
    regex: /(secret|token|password|passwd|pwd|api_?key|access_?key|auth)[\"\'`=:\s]+([a-zA-Z0-9_\-\.!@#$%^&*]{8,})/gi,
    severity: "medium",
    description: "Potential secret key/value pair"
  },
  {
    name: "Gitleaks - Generic Secret",
    regex: /([A-Za-z0-9_-]*(secret|key|token|password)[A-Za-z0-9_-]*)[\"\'`=:\s]+([a-zA-Z0-9_\-\.!@#$%^&*]{8,})/gi,
    severity: "medium",
    description: "Generic secret detected"
  }
];

// Improved function to scan file content for potential secrets
export function scanFileForSecrets(
  file: RepositoryFile,
  scanId: string,
  patterns: SecretPattern[]
): Secret[] {
  const secrets: Secret[] = [];
  
  if (file.type !== 'file' || !file.content) {
    console.log(`Skipping non-file or empty content for ${file.path}`);
    return secrets;
  }
  
  console.log(`Scanning file: ${file.path} (size: ${file.content.length} chars)`);
  const lines = file.content.split('\n');
  
  // Process each line in the file
  lines.forEach((line, lineIndex) => {
    if (!line.trim()) return; // Skip empty lines
    
    // Try each pattern against the current line
    patterns.forEach(pattern => {
      // Reset lastIndex to ensure regex starts from beginning of line
      pattern.regex.lastIndex = 0;
      
      // Apply the regex pattern
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(line)) !== null) {
        console.log(`Match found for pattern ${pattern.name} in file ${file.path} at line ${lineIndex + 1}`);
        console.log(`Matched text: ${match[0]}`);
        
        // Extract additional context (surrounding text) if possible
        const startPos = Math.max(0, match.index - 10);
        const endPos = Math.min(line.length, match.index + match[0].length + 10);
        const context = line.substring(startPos, endPos);
        
        secrets.push({
          id: crypto.randomUUID(),
          scanId,
          filePath: file.path,
          lineNumber: lineIndex + 1,
          secretType: pattern.name,
          severity: pattern.severity,
          description: pattern.description,
          codeSnippet: context,
          date: new Date().toISOString()
        });
      }
    });
  });
  
  console.log(`Found ${secrets.length} secrets in file ${file.path}`);
  return secrets;
}

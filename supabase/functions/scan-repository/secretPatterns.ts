
// Secret scanning pattern definitions and detection logic
import { Secret, SecretPattern, RepositoryFile } from "./types.ts";

// TruffleHog secret detection patterns
export const truffleHogPatterns: SecretPattern[] = [
  {
    name: "TruffleHog - AWS Access Key",
    regex: /AKIA[0-9A-Z]{16}/,
    severity: "high",
    description: "AWS Access Key ID found"
  },
  {
    name: "TruffleHog - API Token",
    regex: /(api|app)_(token|key|secret)[\"\'=:\s]+([a-zA-Z0-9_\-\.]{16,})/i,
    severity: "medium",
    description: "API token/key detected"
  },
  {
    name: "TruffleHog - Password in Code",
    regex: /(password|passwd|pwd)[\"\'=:\s]+([a-zA-Z0-9_\-\.!@#$%^&*]{8,})/i,
    severity: "high",
    description: "Password found in code"
  },
  {
    name: "TruffleHog - AWS Secret Key",
    regex: /[0-9a-zA-Z\/+]{40}/,
    severity: "high",
    description: "Potential AWS Secret Access Key"
  },
  {
    name: "TruffleHog - Private Key",
    regex: /-----BEGIN [A-Z]+ PRIVATE KEY-----/,
    severity: "high",
    description: "Cryptographic private key"
  },
  {
    name: "TruffleHog - Connection String",
    regex: /[a-zA-Z]+:\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+@[a-zA-Z0-9_.-]+/,
    severity: "medium",
    description: "Database connection string"
  }
];

// Gitleaks secret detection patterns
export const gitleaksPatterns: SecretPattern[] = [
  {
    name: "Gitleaks - GitHub Token",
    regex: /gh[pousr]_[a-zA-Z0-9]{36}/,
    severity: "high",
    description: "GitHub Personal Access Token"
  },
  {
    name: "Gitleaks - Private Key",
    regex: /-----BEGIN ([A-Z]+ )?PRIVATE KEY( BLOCK)?-----/,
    severity: "high",
    description: "Gitleaks detected a private key"
  },
  {
    name: "Gitleaks - Connection String",
    regex: /[a-zA-Z]+:\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+@[a-zA-Z0-9_.-]+/,
    severity: "medium",
    description: "Connection string detected"
  },
  {
    name: "Gitleaks - JWT Token",
    regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
    severity: "medium",
    description: "JWT token detected"
  },
  {
    name: "Gitleaks - Authorization Header",
    regex: /Authorization['":\s]*Bearer\s+[a-zA-Z0-9_\-.~+\/]+={0,2}/i,
    severity: "high",
    description: "Authorization header with bearer token"
  }
];

// Function to scan file content for potential secrets using a specific scanner's patterns
export function scanFileForSecrets(
  file: RepositoryFile,
  scanId: string,
  patterns: SecretPattern[]
): Secret[] {
  const secrets: Secret[] = [];
  
  if (file.type !== 'file' || !file.content) {
    return secrets;
  }
  
  const lines = file.content.split('\n');
  
  lines.forEach((line, lineIndex) => {
    patterns.forEach(pattern => {
      if (pattern.regex.test(line)) {
        secrets.push({
          id: crypto.randomUUID(),
          scanId,
          filePath: file.path,
          lineNumber: lineIndex + 1,
          secretType: pattern.name,
          severity: pattern.severity,
          description: pattern.description,
          codeSnippet: line,
          date: new Date().toISOString()
        });
      }
    });
  });
  
  return secrets;
}

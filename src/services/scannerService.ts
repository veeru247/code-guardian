
import { v4 } from '@/lib/utils';
import { 
  Repository, 
  ScanResult, 
  ScannerType, 
  Secret,
  SecretSeverity
} from '@/types';

// Helper to generate scan results based on repository URL
const simulateScan = (repoUrl: string, scannerType: ScannerType): Secret[] => {
  const secrets: Secret[] = [];
  const scanId = v4();
  
  // Generate random number of findings based on scanner type and repo URL
  // This creates deterministic but varied results for different URLs
  const repoHash = hashString(repoUrl);
  const numFindings = (repoHash % 10) + 1;  // 1-10 findings
  
  for (let i = 0; i < numFindings; i++) {
    const severity = simulateSeverity(repoHash + i);
    
    secrets.push({
      id: v4(),
      scanId: scanId,
      filePath: simulateFilePath(repoUrl, i),
      lineNumber: (repoHash + i) % 500 + 1,
      secretType: simulateSecretType(scannerType, i),
      commit: simulateCommitHash(),
      author: simulateAuthor(repoUrl, i),
      date: simulateDate(),
      severity: severity,
      description: `${scannerType}: ${simulateSecretType(scannerType, i)} found in repository`,
      codeSnippet: simulateCodeSnippet(scannerType, repoUrl, i, severity),
    });
  }
  
  return secrets;
};

// Hash a string to a number (simple implementation)
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Simulate severity based on input value
function simulateSeverity(value: number): SecretSeverity {
  const severities: SecretSeverity[] = ['high', 'medium', 'low', 'info'];
  return severities[value % severities.length];
}

// Simulate file path based on repository URL
function simulateFilePath(repoUrl: string, index: number): string {
  const fileTypes = [
    'src/config.js', 
    'src/auth/credentials.ts', 
    '.env', 
    'config/database.yml', 
    'app/secrets.json',
    'deploy/keys.pem',
    '.gitlab-ci.yml',
    'docker-compose.yml',
    'src/api/services/authentication.js',
    'terraform/main.tf'
  ];
  
  // Extract repo name from URL to make it more realistic
  let repoName = '';
  try {
    const url = new URL(repoUrl);
    const pathParts = url.pathname.split('/');
    repoName = pathParts[pathParts.length - 1].replace('.git', '') || 'repo';
  } catch (e) {
    repoName = 'repo';
  }
  
  return `${repoName}/${fileTypes[index % fileTypes.length]}`;
}

// Simulate secret type based on scanner and index
function simulateSecretType(scanner: ScannerType, index: number): string {
  const truffleHogTypes = [
    'AWS Access Key', 
    'Private Key', 
    'GitHub Token', 
    'SSH Key', 
    'API Token'
  ];
  
  const gitleaksTypes = [
    'AWS Secret Key', 
    'Generic API Key', 
    'GitHub OAuth', 
    'Password', 
    'Bearer Token'
  ];
  
  const customTypes = [
    'Database Password', 
    'Encryption Key', 
    'JWT Secret', 
    'Access Credential', 
    'Environment Variable'
  ];
  
  switch (scanner) {
    case 'trufflehog':
      return truffleHogTypes[index % truffleHogTypes.length];
    case 'gitleaks':
      return gitleaksTypes[index % gitleaksTypes.length];
    case 'custom':
      return customTypes[index % customTypes.length];
    default:
      return 'Unknown Secret';
  }
}

// Simulate commit hash
function simulateCommitHash(): string {
  return Array.from({ length: 8 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// Simulate author based on repository URL and index
function simulateAuthor(repoUrl: string, index: number): string {
  const authors = [
    'developer@example.com',
    'admin@company.io',
    'jane.doe@mail.com',
    'john.smith@organization.net',
    'devops@tech.co'
  ];
  
  // Use the URL hash to select an author
  const repoHash = hashString(repoUrl);
  return authors[(repoHash + index) % authors.length];
}

// Simulate date within last year
function simulateDate(): string {
  const now = new Date();
  const pastDate = new Date(now.getTime() - Math.random() * 31536000000); // Random time in the last year
  return pastDate.toISOString();
}

// Simulate code snippet with fake sensitive data
function simulateCodeSnippet(scanner: ScannerType, repoUrl: string, index: number, severity: SecretSeverity): string {
  const codeTemplates = [
    'const apiKey = "{{SECRET}}";',
    'AWS_ACCESS_KEY="{{SECRET}}"',
    'password: "{{SECRET}}",',
    'token = "{{SECRET}}"',
    'SECRET_KEY="{{SECRET}}"'
  ];
  
  // Generate a fake secret value
  const secretValue = Array.from({ length: 20 }, () => 
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
  
  const template = codeTemplates[index % codeTemplates.length];
  return template.replace('{{SECRET}}', secretValue);
}

// Count the number of secrets by severity
const countSecretsBySeverity = (secrets: Secret[]) => {
  const counts = {
    totalSecrets: secrets.length,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    infoSeverity: 0
  };
  
  secrets.forEach(secret => {
    switch (secret.severity) {
      case 'high':
        counts.highSeverity++;
        break;
      case 'medium':
        counts.mediumSeverity++;
        break;
      case 'low':
        counts.lowSeverity++;
        break;
      case 'info':
        counts.infoSeverity++;
        break;
    }
  });
  
  return counts;
};

// Generate repository ID from URL
const getRepoIdFromUrl = (url: string): string => {
  try {
    return url;
  } catch (error) {
    return url;
  }
};

// Client-side simulation of repository scanning
export const scanRepository = async (
  repositoryUrl: string, 
  scannerTypes: ScannerType[]
): Promise<ScanResult> => {
  console.log(`Simulating scan of repository: ${repositoryUrl} with scanners: ${scannerTypes.join(', ')}`);
  
  // Create scan result shell with unique ID
  const scanId = v4();
  const repoId = getRepoIdFromUrl(repositoryUrl);
  const startTime = new Date().toISOString();
  
  let allSecrets: Secret[] = [];
  
  // Simulate scanning delay (1-3 seconds)
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Run each selected scanner simulation
  for (const scannerType of scannerTypes) {
    try {
      // Simulate scanning results
      const secrets = simulateScan(repositoryUrl, scannerType);
      console.log(`Found ${secrets.length} secrets with ${scannerType}`);
      
      // Add scanner type to each secret for reference
      const secretsWithScanner = secrets.map(secret => ({
        ...secret,
        scanId,
        secretType: `${scannerType}: ${secret.secretType}`
      }));
      
      allSecrets = [...allSecrets, ...secretsWithScanner];
    } catch (error) {
      console.error(`Error simulating ${scannerType}:`, error);
    }
  }
  
  // Create the final scan result
  const summary = countSecretsBySeverity(allSecrets);
  
  return {
    id: scanId,
    repositoryId: repoId,
    configId: v4(),
    status: 'completed',
    startedAt: startTime,
    completedAt: new Date().toISOString(),
    secrets: allSecrets,
    summary
  };
};

// Get information about repositories that have been scanned
export const getRepositories = async (): Promise<Repository[]> => {
  // This would normally fetch from a database
  // Here we're just returning an empty array since we don't persist data
  return [];
};

// Get all scan results
export const getScanResults = async (repositoryId?: string): Promise<ScanResult[]> => {
  // This would normally fetch from a database
  // Here we're just returning an empty array since we don't persist data
  return [];
};

// Get a specific scan result by ID
export const getScanResult = async (scanId: string): Promise<ScanResult | null> => {
  // This would normally fetch from a database
  // Here we're just returning null since we don't persist data
  return null;
};

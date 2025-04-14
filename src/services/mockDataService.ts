
import { Repository, ScanConfig, ScanResult, ScannerType, Secret, SecretSeverity } from '@/types';
import { v4 } from '@/lib/utils';

// Repositories data store
const repositories: Repository[] = [];

// Scan results data store
const scanResults: ScanResult[] = [];

// Get all repositories
export const getRepositories = async (): Promise<Repository[]> => {
  return repositories;
};

// Get all scan results with optional filter by repository
export const getScanResults = async (repositoryId?: string): Promise<ScanResult[]> => {
  if (repositoryId) {
    return scanResults.filter(result => result.repositoryId === repositoryId);
  }
  return scanResults;
};

// Get a specific scan result by ID
export const getScanResult = async (scanId: string): Promise<ScanResult | null> => {
  const result = scanResults.find(scan => scan.id === scanId);
  return result || null;
};

// Generate mock secrets based on repository URL and selected scanner types
const generateMockSecrets = (
  scanId: string, 
  repositoryUrl: string, 
  scannerTypes: ScannerType[]
): Secret[] => {
  // Parse repository owner and name from URL
  let repoOwner = 'unknown';
  let repoName = 'unknown';
  
  try {
    const urlObj = new URL(repositoryUrl);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      repoOwner = pathParts[pathParts.length - 2];
      repoName = pathParts[pathParts.length - 1].replace('.git', '');
    }
  } catch (e) {
    console.error('Error parsing repository URL:', e);
  }
  
  // Base secrets that will be shown for any scanner type
  const baseSecrets: Secret[] = [
    {
      id: v4(),
      scanId,
      filePath: `${repoName}/config/database.yml`,
      lineNumber: 15,
      secretType: 'Database Password',
      secretValue: 'db_password_123',
      commit: '1a2b3c4d5e6f7g8h9i0j',
      author: `${repoOwner}@example.com`,
      date: new Date().toISOString(),
      severity: 'high',
      description: `Database password found in ${repoName}/config/database.yml`,
      codeSnippet: `password: "db_password_123" # DO NOT COMMIT THIS`,
    },
    {
      id: v4(),
      scanId,
      filePath: `${repoName}/.env`,
      lineNumber: 5,
      secretType: 'API Key',
      secretValue: 'api_key_123456789',
      commit: '2b3c4d5e6f7g8h9i0j1k',
      author: `${repoOwner}@example.com`,
      date: new Date().toISOString(),
      severity: 'high',
      description: `API Key found in ${repoName}/.env file`,
      codeSnippet: `API_KEY="api_key_123456789"`,
    }
  ];
  
  // Trufflehog-specific secrets
  const trufflehogSecrets: Secret[] = scannerTypes.includes('trufflehog') ? [
    {
      id: v4(),
      scanId,
      filePath: `${repoName}/src/config.js`,
      lineNumber: 23,
      secretType: 'AWS Access Key',
      secretValue: 'AKIA1234567890ABCDEF',
      commit: '3c4d5e6f7g8h9i0j1k2l',
      author: `${repoOwner}@example.com`,
      date: new Date().toISOString(),
      severity: 'high',
      description: `AWS Access Key found in ${repoName}/src/config.js`,
      codeSnippet: `const awsAccessKey = 'AKIA1234567890ABCDEF';`,
    },
    {
      id: v4(),
      scanId,
      filePath: `${repoName}/scripts/deploy.sh`,
      lineNumber: 8,
      secretType: 'Private SSH Key',
      commit: '4d5e6f7g8h9i0j1k2l3m',
      author: `${repoOwner}@example.com`,
      date: new Date().toISOString(),
      severity: 'medium',
      description: `Private SSH Key found in ${repoName}/scripts/deploy.sh`,
      codeSnippet: `# SSH Key: -----BEGIN RSA PRIVATE KEY----- MIIEpAIBAAKCAQEA1234567890...`,
    }
  ] : [];
  
  // Gitleaks-specific secrets
  const gitleaksSecrets: Secret[] = scannerTypes.includes('gitleaks') ? [
    {
      id: v4(),
      scanId,
      filePath: `${repoName}/tests/fixtures/test_data.json`,
      lineNumber: 42,
      secretType: 'GitHub Token',
      secretValue: 'ghp_1234567890abcdefghijklmnopqrstuvwxyz',
      commit: '5e6f7g8h9i0j1k2l3m4n',
      author: `${repoOwner}@example.com`,
      date: new Date().toISOString(),
      severity: 'high',
      description: `GitHub Token found in ${repoName}/tests/fixtures/test_data.json`,
      codeSnippet: `"github_token": "ghp_1234567890abcdefghijklmnopqrstuvwxyz"`,
    },
    {
      id: v4(),
      scanId,
      filePath: `${repoName}/docker-compose.yml`,
      lineNumber: 18,
      secretType: 'Docker Registry Password',
      secretValue: 'docker_password_456',
      commit: '6f7g8h9i0j1k2l3m4n5o',
      author: `${repoOwner}@example.com`,
      date: new Date().toISOString(),
      severity: 'medium',
      description: `Docker Registry Password found in ${repoName}/docker-compose.yml`,
      codeSnippet: `DOCKER_REGISTRY_PASSWORD: docker_password_456`,
    }
  ] : [];
  
  // Custom scanner secrets
  const customSecrets: Secret[] = scannerTypes.includes('custom') ? [
    {
      id: v4(),
      scanId,
      filePath: `${repoName}/app/models/user.rb`,
      lineNumber: 56,
      secretType: 'Hardcoded JWT Secret',
      secretValue: 'jwt_super_secret_key_123',
      commit: '7g8h9i0j1k2l3m4n5o6p',
      author: `${repoOwner}@example.com`,
      date: new Date().toISOString(),
      severity: 'medium',
      description: `Hardcoded JWT Secret found in ${repoName}/app/models/user.rb`,
      codeSnippet: `JWT.encode(payload, 'jwt_super_secret_key_123')`,
    },
    {
      id: v4(),
      scanId,
      filePath: `${repoName}/config/initializers/secret_token.rb`,
      lineNumber: 12,
      secretType: 'Rails Secret Token',
      secretValue: 'a1b2c3d4e5f6g7h8i9j0',
      commit: '8h9i0j1k2l3m4n5o6p7q',
      author: `${repoOwner}@example.com`,
      date: new Date().toISOString(),
      severity: 'low',
      description: `Rails Secret Token found in ${repoName}/config/initializers/secret_token.rb`,
      codeSnippet: `Rails.application.config.secret_token = 'a1b2c3d4e5f6g7h8i9j0'`,
    },
    {
      id: v4(),
      scanId,
      filePath: `${repoName}/README.md`,
      lineNumber: 89,
      secretType: 'Example Connection String',
      secretValue: 'mongodb://user:password@example.com:27017/db',
      commit: '9i0j1k2l3m4n5o6p7q8r',
      author: `${repoOwner}@example.com`,
      date: new Date().toISOString(),
      severity: 'info',
      description: `Example Connection String found in ${repoName}/README.md`,
      codeSnippet: '```\nmongodb://user:password@example.com:27017/db\n```',
    }
  ] : [];
  
  // Combine all secrets based on selected scanner types
  return [...baseSecrets, ...trufflehogSecrets, ...gitleaksSecrets, ...customSecrets];
};

// Start a new scan
export const startScan = async (
  repositoryUrl: string, 
  scannerTypes: ScannerType[]
): Promise<ScanResult> => {
  // Check if repository already exists
  let repository = repositories.find(repo => repo.url === repositoryUrl);
  
  // If not, create a new repository
  if (!repository) {
    repository = {
      id: v4(),
      name: extractRepoName(repositoryUrl),
      url: repositoryUrl,
      lastScannedAt: new Date().toISOString(),
    };
    repositories.push(repository);
  } else {
    // Update last scanned time
    repository.lastScannedAt = new Date().toISOString();
  }
  
  // Create a new scan configuration
  const scanConfig: ScanConfig = {
    id: v4(),
    repositoryId: repository.id,
    scannerType: scannerTypes,
    createdAt: new Date().toISOString(),
  };
  
  // Generate scan ID
  const scanId = v4();
  
  // Generate mock secrets based on repository URL and scanner types
  const secrets = generateMockSecrets(scanId, repositoryUrl, scannerTypes);
  
  // Calculate summary counts
  const summary = calculateSecretsSummary(secrets);
  
  // Create new scan result
  const scanResult: ScanResult = {
    id: scanId,
    repositoryId: repository.id,
    configId: scanConfig.id,
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    secrets,
    summary,
  };
  
  // Add to scan results
  scanResults.unshift(scanResult);
  
  return scanResult;
};

// Helper function to calculate secrets summary
const calculateSecretsSummary = (secrets: Secret[]) => {
  return {
    totalSecrets: secrets.length,
    highSeverity: secrets.filter(secret => secret.severity === 'high').length,
    mediumSeverity: secrets.filter(secret => secret.severity === 'medium').length,
    lowSeverity: secrets.filter(secret => secret.severity === 'low').length,
    infoSeverity: secrets.filter(secret => secret.severity === 'info').length,
  };
};

// Helper function to extract repository name from URL
const extractRepoName = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length >= 2) {
      return `${pathParts[pathParts.length - 2]}/${pathParts[pathParts.length - 1].replace('.git', '')}`;
    } else if (pathParts.length === 1) {
      return pathParts[0].replace('.git', '');
    }
    
    return url;
  } catch (e) {
    // If URL parsing fails, extract what looks like a repo name
    const parts = url.split('/');
    return parts[parts.length - 1].replace('.git', '') || url;
  }
};

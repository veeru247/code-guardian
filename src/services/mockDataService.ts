
import { Repository, ScanConfig, ScanResult, Secret, SecretSeverity, ScannerType } from '../types';
import { v4 as uuidv4 } from '@/lib/utils';

// Mock repository data
const mockRepositories: Repository[] = [
  {
    id: '1',
    name: 'frontend-app',
    url: 'https://github.com/company/frontend-app',
    branch: 'main',
    lastScannedAt: '2023-04-10T14:30:00Z',
  },
  {
    id: '2',
    name: 'backend-api',
    url: 'https://github.com/company/backend-api',
    branch: 'master',
    lastScannedAt: '2023-04-12T09:15:00Z',
  },
  {
    id: '3',
    name: 'data-processor',
    url: 'https://github.com/company/data-processor',
    branch: 'develop',
  },
];

// Mock scan configurations
const mockScanConfigs: ScanConfig[] = [
  {
    id: '1',
    repositoryId: '1',
    scannerType: ['trufflehog', 'gitleaks'],
    excludePatterns: ['*.md', '*.txt'],
    maxDepth: 1000,
    createdAt: '2023-04-10T14:25:00Z',
  },
  {
    id: '2',
    repositoryId: '2',
    scannerType: ['trufflehog'],
    maxDepth: 500,
    createdAt: '2023-04-12T09:10:00Z',
  },
];

// Mock secrets
const generateMockSecrets = (scanId: string, count: number = 10): Secret[] => {
  const secretTypes = ['AWS Key', 'GitHub Token', 'API Key', 'Password', 'SSH Key', 'Database Connection String'];
  const severities: SecretSeverity[] = ['high', 'medium', 'low', 'info'];
  const filePaths = [
    'src/config/aws.config.js',
    'src/services/api.service.ts',
    '.env',
    'config/database.yml',
    'docker-compose.yml',
    'scripts/deploy.sh',
    'src/utils/auth.js',
  ];
  
  const secrets: Secret[] = [];
  
  for (let i = 0; i < count; i++) {
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const secretType = secretTypes[Math.floor(Math.random() * secretTypes.length)];
    const filePath = filePaths[Math.floor(Math.random() * filePaths.length)];
    
    let codeSnippet = '';
    switch (secretType) {
      case 'AWS Key':
        codeSnippet = `const awsConfig = {
  accessKeyId: 'AKIA1234567890EXAMPLE',
  secretAccessKey: '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234'
};`;
        break;
      case 'GitHub Token':
        codeSnippet = `const token = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';`;
        break;
      case 'API Key':
        codeSnippet = `axios.defaults.headers.common['Authorization'] = 'Bearer api_1234567890abcdefghijklmnopqrstuvwxyz';`;
        break;
      case 'Password':
        codeSnippet = `const dbConfig = {
  user: 'admin',
  password: 'SuperSecretPassword123!'
};`;
        break;
      default:
        codeSnippet = `// Secret found in this file
const secret = 'This is a sensitive value';`;
    }
    
    secrets.push({
      id: uuidv4(),
      scanId,
      filePath,
      lineNumber: Math.floor(Math.random() * 200) + 1,
      secretType,
      severity,
      author: 'developer@example.com',
      date: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
      commit: Math.random().toString(16).slice(2, 10),
      description: `Found ${secretType} in ${filePath}`,
      codeSnippet,
    });
  }
  
  return secrets;
};

// Mock scan results
const mockScanResults: ScanResult[] = [
  {
    id: '1',
    repositoryId: '1',
    configId: '1',
    status: 'completed',
    startedAt: '2023-04-10T14:30:00Z',
    completedAt: '2023-04-10T14:35:00Z',
    secrets: generateMockSecrets('1', 12),
    summary: {
      totalSecrets: 12,
      highSeverity: 4,
      mediumSeverity: 5,
      lowSeverity: 2,
      infoSeverity: 1,
    },
  },
  {
    id: '2',
    repositoryId: '2',
    configId: '2',
    status: 'completed',
    startedAt: '2023-04-12T09:15:00Z',
    completedAt: '2023-04-12T09:18:00Z',
    secrets: generateMockSecrets('2', 7),
    summary: {
      totalSecrets: 7,
      highSeverity: 2,
      mediumSeverity: 3,
      lowSeverity: 1,
      infoSeverity: 1,
    },
  },
];

// Mock service functions
export const getRepositories = (): Promise<Repository[]> => {
  return Promise.resolve([...mockRepositories]);
};

export const getRepository = (id: string): Promise<Repository | undefined> => {
  return Promise.resolve(mockRepositories.find(repo => repo.id === id));
};

export const getScanConfigs = (repositoryId?: string): Promise<ScanConfig[]> => {
  let configs = [...mockScanConfigs];
  if (repositoryId) {
    configs = configs.filter(config => config.repositoryId === repositoryId);
  }
  return Promise.resolve(configs);
};

export const getScanResults = (repositoryId?: string): Promise<ScanResult[]> => {
  let results = [...mockScanResults];
  if (repositoryId) {
    results = results.filter(result => result.repositoryId === repositoryId);
  }
  return Promise.resolve(results);
};

export const getScanResult = (id: string): Promise<ScanResult | undefined> => {
  return Promise.resolve(mockScanResults.find(result => result.id === id));
};

export const createRepository = (repository: Omit<Repository, 'id'>): Promise<Repository> => {
  const newRepository: Repository = {
    ...repository,
    id: uuidv4(),
  };
  mockRepositories.push(newRepository);
  return Promise.resolve(newRepository);
};

export const startScan = async (repositoryUrl: string, scannerTypes: ScannerType[]): Promise<ScanResult> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Create or find repository
  let repository: Repository;
  const existingRepo = mockRepositories.find(r => r.url === repositoryUrl);
  
  if (existingRepo) {
    repository = existingRepo;
  } else {
    repository = {
      id: uuidv4(),
      name: repositoryUrl.split('/').pop() || 'unknown-repo',
      url: repositoryUrl,
      branch: 'main',
    };
    mockRepositories.push(repository);
  }
  
  // Create scan config
  const scanConfig: ScanConfig = {
    id: uuidv4(),
    repositoryId: repository.id,
    scannerType: scannerTypes,
    createdAt: new Date().toISOString(),
  };
  mockScanConfigs.push(scanConfig);
  
  // Create scan result
  const scanId = uuidv4();
  const secrets = generateMockSecrets(scanId, Math.floor(Math.random() * 15) + 5);
  
  const highSeverity = secrets.filter(s => s.severity === 'high').length;
  const mediumSeverity = secrets.filter(s => s.severity === 'medium').length;
  const lowSeverity = secrets.filter(s => s.severity === 'low').length;
  const infoSeverity = secrets.filter(s => s.severity === 'info').length;
  
  const scanResult: ScanResult = {
    id: scanId,
    repositoryId: repository.id,
    configId: scanConfig.id,
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date(Date.now() + 3000).toISOString(),
    secrets,
    summary: {
      totalSecrets: secrets.length,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      infoSeverity,
    },
  };
  
  mockScanResults.push(scanResult);
  return scanResult;
};

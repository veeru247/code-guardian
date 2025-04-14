
export type Repository = {
  id: string;
  name: string;
  url: string;
  branch?: string;
  lastScannedAt?: string;
};

export type ScanConfig = {
  id: string;
  repositoryId: string;
  scannerType: ScannerType[];
  includePatterns?: string[];
  excludePatterns?: string[];
  maxDepth?: number;
  createdAt: string;
};

export type ScannerType = 'trufflehog' | 'gitleaks' | 'custom';

export type SecretSeverity = 'high' | 'medium' | 'low' | 'info';

export type Secret = {
  id: string;
  scanId: string;
  filePath: string;
  lineNumber: number;
  secretType: string;
  secretValue?: string;
  commit?: string;
  author?: string;
  date?: string;
  severity: SecretSeverity;
  description?: string;
  codeSnippet?: string;
};

export type ScanResult = {
  id: string;
  repositoryId: string;
  configId: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  secrets: Secret[];
  summary: {
    totalSecrets: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
    infoSeverity: number;
  };
};

export type ScanFilter = {
  repositoryId?: string;
  severity?: SecretSeverity;
  secretType?: string;
  dateRange?: {
    from: string;
    to: string;
  };
};

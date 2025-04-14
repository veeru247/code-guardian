
// Shared type definitions for the scan-repository function

export interface Secret {
  id: string;
  scanId: string;
  filePath: string;
  lineNumber: number;
  secretType: string;
  secretValue?: string;
  commit?: string;
  author?: string;
  date?: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  description?: string;
  codeSnippet?: string;
}

export interface ScanResult {
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
}

export interface ScanRequest {
  repositoryUrl: string;
  scannerTypes: string[];
  repositoryId?: string;
}

export interface ScannerOptions {
  repoPath: string;
  scanId?: string;
}

export interface ScanSummary {
  totalSecrets: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  infoSeverity: number;
}

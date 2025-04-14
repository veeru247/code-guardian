
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
  files?: RepositoryFile[]; // Add files to scan results
}

export interface ScanRequest {
  repositoryUrl: string;
  scannerTypes: string[];
  repositoryId?: string;
}

export interface ScannerOptions {
  repoPath: string;
  scanId?: string;
  repositoryUrl: string;
}

export interface ScanSummary {
  totalSecrets: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  infoSeverity: number;
}

// Mock secret patterns for simulation
export interface SecretPattern {
  name: string;
  regex: RegExp;
  severity: 'high' | 'medium' | 'low' | 'info';
  description: string;
}

// New interface for repository files
export interface RepositoryFile {
  path: string;
  content: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: string;
}


// Shared type definitions for the scan-local-files function

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
  files?: RepositoryFile[];
}

export interface ScanRequest {
  repositoryUrl: string;
  scannerTypes: string[];
  repositoryId?: string;
}

export interface ScannerOptions {
  repositoryUrl: string;
  scanId?: string;
  files: RepositoryFile[];
}

export interface ScanSummary {
  totalSecrets: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  infoSeverity: number;
}

export interface PatternMatch {
  match: string;
  line: number;
  filePath: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  description: string;
  type: string;
}

// Repository file interface
export interface RepositoryFile {
  path: string;
  content: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: string;
}

// Secret pattern interface
export interface SecretPattern {
  name: string;
  regex: RegExp;
  severity: 'high' | 'medium' | 'low' | 'info';
  description: string;
}

// Git API response interfaces
export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: string;
  content?: string;
  encoding?: string;
}

export interface GitHubDirectory {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: string;
}

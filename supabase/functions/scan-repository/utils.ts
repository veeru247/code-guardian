
import { Secret, ScanSummary, SecretPattern, RepositoryFile, GitHubFileContent, GitHubDirectory, PatternMatch } from "./types.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set Supabase credentials for Edge Function
const supabaseUrl = "https://ffxgtodowddzxlqraxlt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmeGd0b2Rvd2RkenhscXJheGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1OTE4MTMsImV4cCI6MjA2MDE2NzgxM30.SsTedFa8hb1vlEGR0IYjCPAzNvLBduXnHXalWjRT0w8";

// Create Supabase client for the edge function
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// CORS headers for all responses
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
  "Content-Type": "application/json"
};

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

// Calculate summary statistics from secrets
export function calculateSummary(secrets: Secret[]): ScanSummary {
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
}

// Extract repository name from URL
export function extractRepoName(url: string): string {
  try {
    // Parse GitHub URL to extract owner and repo name
    const regex = /github\.com\/([^\/]+)\/([^\/\.]+)/;
    const match = url.match(regex);
    
    if (match && match.length >= 3) {
      return match[2];
    }
    
    // Handle various Git URL formats as fallback
    let name = url.split('/').pop() || 'unknown-repo';
    
    // Remove .git extension if present
    name = name.replace(/\.git$/, '');
    
    // Handle URLs with query parameters
    name = name.split('?')[0];
    
    return name;
  } catch (error) {
    console.error('Error extracting repo name:', error);
    return 'unknown-repo';
  }
}

// Extract owner and repo from GitHub URL
export function extractOwnerAndRepo(url: string): { owner: string; repo: string } | null {
  try {
    const regex = /github\.com\/([^\/]+)\/([^\/\.]+)/;
    const match = url.match(regex);
    
    if (match && match.length >= 3) {
      return {
        owner: match[1],
        repo: match[2]
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting owner and repo:', error);
    return null;
  }
}

// Fetch repository contents using GitHub API
export async function fetchRepositoryContents(repositoryUrl: string): Promise<RepositoryFile[]> {
  console.log(`Fetching repository contents for: ${repositoryUrl}`);
  
  const repoInfo = extractOwnerAndRepo(repositoryUrl);
  if (!repoInfo) {
    throw new Error(`Could not parse GitHub repository URL: ${repositoryUrl}`);
  }
  
  try {
    const files: RepositoryFile[] = [];
    await fetchDirectoryContents(repoInfo.owner, repoInfo.repo, '', files);
    console.log(`Fetched ${files.length} files from repository`);
    return files;
  } catch (error) {
    console.error('Error fetching repository contents:', error);
    throw error;
  }
}

// Recursive function to fetch directory contents
async function fetchDirectoryContents(
  owner: string,
  repo: string,
  path: string,
  files: RepositoryFile[],
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<void> {
  if (currentDepth > maxDepth) {
    console.log(`Maximum depth reached for path: ${path}`);
    return;
  }
  
  try {
    // GitHub API URL for repo contents
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    console.log(`Fetching: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`GitHub API error: ${response.status} - ${error}`);
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const contents = await response.json();
    
    // Handle both single file and directory responses
    const items = Array.isArray(contents) ? contents : [contents];
    
    for (const item of items) {
      if (item.type === 'dir') {
        // Add directory to files list
        files.push({
          path: item.path,
          content: '',
          type: 'directory',
          size: 0,
          lastModified: new Date().toISOString()
        });
        
        // Recursively fetch contents of this directory
        await fetchDirectoryContents(owner, repo, item.path, files, maxDepth, currentDepth + 1);
      } else if (item.type === 'file') {
        // Only fetch content for text files under a certain size
        if (shouldFetchFileContent(item)) {
          const fileContent = await fetchFileContent(owner, repo, item.path);
          files.push({
            path: item.path,
            content: fileContent,
            type: 'file',
            size: item.size,
            lastModified: new Date().toISOString()
          });
        } else {
          // Skip content fetch for binary or large files
          files.push({
            path: item.path,
            content: 'Binary or large file content not fetched',
            type: 'file',
            size: item.size,
            lastModified: new Date().toISOString()
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching directory contents for ${path}:`, error);
    // Don't throw, continue with other directories
  }
}

// Decide whether to fetch a file's content based on size and extension
function shouldFetchFileContent(file: GitHubFileContent | GitHubDirectory): boolean {
  // Skip files larger than 1MB
  if (file.size > 1024 * 1024) {
    return false;
  }
  
  // Skip common binary files
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', 
    '.zip', '.gz', '.tar', '.mp3', '.mp4', '.mov', '.avi',
    '.exe', '.dll', '.so', '.dylib', '.jar', '.war', '.ear',
    '.class', '.psd', '.ttf', '.woff', '.woff2', '.eot'
  ];
  
  if (binaryExtensions.some(ext => file.path.toLowerCase().endsWith(ext))) {
    return false;
  }
  
  return true;
}

// Fetch content of a specific file
async function fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Error fetching file content for ${path}: ${response.status}`);
      return '';
    }
    
    const data = await response.json();
    
    if (data.encoding === 'base64' && data.content) {
      // Decode Base64 content
      const decoded = atob(data.content.replace(/\n/g, ''));
      return decoded;
    }
    
    return 'File content could not be decoded';
  } catch (error) {
    console.error(`Error fetching content for ${path}:`, error);
    return '';
  }
}

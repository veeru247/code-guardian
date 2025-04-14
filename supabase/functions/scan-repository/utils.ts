
import { Secret, ScanSummary, SecretPattern } from "./types.ts";
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

// Common secret detection patterns
export const commonSecretPatterns: SecretPattern[] = [
  {
    name: "AWS Access Key",
    regex: /AKIA[0-9A-Z]{16}/,
    severity: "high",
    description: "AWS Access Key ID found"
  },
  {
    name: "AWS Secret Key",
    regex: /[0-9a-zA-Z\/+]{40}/,
    severity: "high",
    description: "Potential AWS Secret Access Key"
  },
  {
    name: "GitHub Token",
    regex: /gh[pousr]_[a-zA-Z0-9]{36}/,
    severity: "high",
    description: "GitHub Personal Access Token"
  },
  {
    name: "API Key",
    regex: /api[_-]?key[\"\'=:\s]+[a-zA-Z0-9_\-]{16,}/i,
    severity: "medium",
    description: "Generic API Key"
  },
  {
    name: "Private Key",
    regex: /-----BEGIN [A-Z]+ PRIVATE KEY-----/,
    severity: "high",
    description: "Cryptographic private key"
  },
  {
    name: "Password",
    regex: /password[\"\'=:\s]+[a-zA-Z0-9_\-!@#$%^&*]{8,}/i,
    severity: "medium",
    description: "Password in code"
  },
  {
    name: "Connection String",
    regex: /[a-zA-Z]+:\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
    severity: "medium",
    description: "Database connection string"
  },
  {
    name: "Token",
    regex: /token[\"\'=:\s]+[a-zA-Z0-9_\-\.]{16,}/i,
    severity: "medium",
    description: "Authentication token"
  }
];

// Function to analyze content for potential secrets
export function analyzeContentForSecrets(
  content: string,
  filePath: string,
  lineNumber: number,
  scanId: string,
  patterns: SecretPattern[] = commonSecretPatterns
): Secret[] {
  const secrets: Secret[] = [];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(content)) {
      secrets.push({
        id: crypto.randomUUID(),
        scanId,
        filePath,
        lineNumber,
        secretType: pattern.name,
        severity: pattern.severity,
        description: pattern.description,
        codeSnippet: content,
        date: new Date().toISOString(),
        author: "Unknown (simulation)",
        commit: "simulation"
      });
    }
  }
  
  return secrets;
}

// Function to simulate repository analysis instead of cloning
export async function analyzeRepository(repoUrl: string): Promise<{ path: string, success: boolean }> {
  console.log("Simulating repository analysis for:", repoUrl);
  
  try {
    // Simulate a successful analysis operation
    // In a real-world scenario, we would fetch repository details from the GitHub API
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
    
    return {
      path: "virtual-repo-path", // This is just a placeholder, not an actual file path
      success: true
    };
  } catch (error) {
    console.error("Error simulating repository analysis:", error);
    throw error;
  }
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

// Determine severity based on secret type
export function determineSeverity(secretType: string): 'high' | 'medium' | 'low' | 'info' {
  // Define high severity secret types
  const highSeverityTypes = [
    'AWS', 'ApiKey', 'PrivateKey', 'Token', 'Password', 'Secret', 'Credential',
    'Authorization', 'OAuth', 'Key', 'Certificate', 'SSH', 'PGP', 'RSA'
  ];
  
  // Define medium severity secret types
  const mediumSeverityTypes = [
    'Connection', 'Database', 'Config', 'Environment', 'Email'
  ];
  
  // Check if the secretType contains any high severity keywords
  for (const type of highSeverityTypes) {
    if (secretType.toLowerCase().includes(type.toLowerCase())) {
      return 'high';
    }
  }
  
  // Check if the secretType contains any medium severity keywords
  for (const type of mediumSeverityTypes) {
    if (secretType.toLowerCase().includes(type.toLowerCase())) {
      return 'medium';
    }
  }
  
  // Default to low severity
  return 'low';
}

// Extract repository name from URL
export function extractRepoName(url: string): string {
  try {
    // Handle various Git URL formats
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

// Function to simulate fetching common file contents from a repository
export async function fetchCommonRepositoryFiles(repoUrl: string): Promise<{ path: string, content: string }[]> {
  // In a real implementation, this would make API calls to GitHub/GitLab/etc.
  console.log(`Simulating fetching files from repository: ${repoUrl}`);

  // Simulate a delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Create a list of common files that might contain secrets
  return [
    {
      path: 'config/database.yml',
      content: `
production:
  adapter: postgresql
  database: app_production
  username: app_user
  password: db_password_123456
  host: db.example.com
      `
    },
    {
      path: '.env',
      content: `
API_KEY=api_key_12345abcdef
GITHUB_TOKEN=github_pat_abcdefg123456
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
      `
    },
    {
      path: 'src/config.js',
      content: `
// Configuration for the application
const config = {
  apiEndpoint: 'https://api.example.com',
  secret: 'app_secret_token_123456',
  token: 'jwt_signing_key_abcdef'
};

export default config;
      `
    },
    {
      path: 'deploy/docker-compose.yml',
      content: `
version: '3'
services:
  app:
    image: example-app
    environment:
      - DATABASE_URL=postgres://user:password@db:5432/app
      - SESSION_SECRET=session_secret_key_123456
  db:
    image: postgres
    environment:
      - POSTGRES_PASSWORD=strong_db_password_789
      `
    }
  ];
}

// Helper function to clean up (we don't actually need to clean up in this simulation)
export async function cleanupTempDir(path: string): Promise<void> {
  // This function is a no-op in our environment since we're not actually creating dirs
  console.log("Simulation cleanup for path:", path);
}


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Type definitions
interface Secret {
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

interface ScanResult {
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

// Mock repository data
const mockRepositories = [
  {
    id: "repo1",
    name: "Example Repository 1",
    url: "https://github.com/example/repo1",
    branch: "main",
    lastScannedAt: new Date().toISOString()
  },
  {
    id: "repo2",
    name: "Example Repository 2",
    url: "https://github.com/example/repo2",
    branch: "master",
    lastScannedAt: new Date().toISOString()
  }
];

// Mock secret data
const mockSecrets: Secret[] = [
  {
    id: "secret1",
    scanId: "scan1",
    filePath: "src/config.js",
    lineNumber: 15,
    secretType: "AWS Access Key",
    commit: "abcdef123456789",
    author: "Developer A",
    date: new Date().toISOString(),
    severity: "high",
    description: "AWS access key found in source code",
    codeSnippet: "const awsKey = 'AKIA1234567890EXAMPLE';"
  },
  {
    id: "secret2",
    scanId: "scan1",
    filePath: "src/database.js",
    lineNumber: 27,
    secretType: "Database Password",
    commit: "fedcba987654321",
    author: "Developer B",
    date: new Date().toISOString(),
    severity: "medium",
    description: "Database password found in plain text",
    codeSnippet: "const dbPassword = 'super_secure_password123';"
  },
  {
    id: "secret3",
    scanId: "scan1",
    filePath: ".env",
    lineNumber: 5,
    secretType: "API Key",
    commit: "123abc456def789",
    author: "Developer C",
    date: new Date().toISOString(),
    severity: "medium",
    description: "Third-party API key found in .env file",
    codeSnippet: "API_KEY=1234567890abcdef"
  },
  {
    id: "secret4",
    scanId: "scan1",
    filePath: "src/utils/auth.js",
    lineNumber: 42,
    secretType: "JWT Secret",
    commit: "789ghi123jkl456",
    author: "Developer A",
    date: new Date().toISOString(),
    severity: "high",
    description: "JWT secret key hardcoded in auth utility",
    codeSnippet: "const jwtSecret = 'very_secret_key_do_not_share';"
  },
  {
    id: "secret5",
    scanId: "scan1",
    filePath: "config/production.json",
    lineNumber: 8,
    secretType: "OAuth Client Secret",
    commit: "456mno789pqr123",
    author: "Developer D",
    date: new Date().toISOString(),
    severity: "high",
    description: "OAuth client secret found in config file",
    codeSnippet: "{ \"clientSecret\": \"oauth_client_secret_value\" }"
  },
  {
    id: "secret6",
    scanId: "scan1",
    filePath: "scripts/deploy.sh",
    lineNumber: 17,
    secretType: "SSH Private Key",
    commit: "321stu654vwx987",
    author: "Developer E",
    date: new Date().toISOString(),
    severity: "low",
    description: "SSH private key path exposed in deploy script",
    codeSnippet: "ssh -i ~/.ssh/id_rsa user@server.example.com"
  },
  {
    id: "secret7",
    scanId: "scan1",
    filePath: "src/services/payment.js",
    lineNumber: 31,
    secretType: "Stripe API Key",
    commit: "654yz987abc321",
    author: "Developer B",
    date: new Date().toISOString(),
    severity: "high",
    description: "Stripe API key hardcoded in payment service",
    codeSnippet: "const stripeKey = 'sk_live_1234567890abcdefghijklmn';"
  },
  {
    id: "secret8",
    scanId: "scan1",
    filePath: "docker-compose.yml",
    lineNumber: 12,
    secretType: "Environment Variable",
    commit: "987def654ghi321",
    author: "Developer C",
    date: new Date().toISOString(),
    severity: "low",
    description: "Sensitive environment variable in Docker compose file",
    codeSnippet: "ADMIN_PASSWORD: admin123"
  },
  {
    id: "secret9",
    scanId: "scan1",
    filePath: "src/middleware/logging.js",
    lineNumber: 7,
    secretType: "Log API Token",
    commit: "123jkl456mno789",
    author: "Developer A",
    date: new Date().toISOString(),
    severity: "info",
    description: "Logging service API token in middleware",
    codeSnippet: "const logToken = 'log_service_token_123';"
  },
  {
    id: "secret10",
    scanId: "scan1",
    filePath: "terraform/main.tf",
    lineNumber: 23,
    secretType: "Cloud Credentials",
    commit: "789pqr123stu456",
    author: "Developer E",
    date: new Date().toISOString(),
    severity: "medium",
    description: "Cloud provider credentials in Terraform config",
    codeSnippet: "access_key = \"AKIAIOSFODNN7EXAMPLE\""
  }
];

// Mock scan generation function
function generateMockScan(repositoryId: string, scannerTypes: string[]): ScanResult {
  // Determine how many secrets to include based on scanner types
  const secretCount = Math.min(mockSecrets.length, 
    scannerTypes.includes('trufflehog') ? 7 : 
    scannerTypes.includes('gitleaks') ? 5 : 3);
  
  // Get a subset of mock secrets
  const secrets = mockSecrets.slice(0, secretCount).map(secret => ({
    ...secret,
    id: crypto.randomUUID(),
  }));
  
  // Calculate summary statistics
  const summary = calculateSummary(secrets);
  
  return {
    id: crypto.randomUUID(),
    repositoryId,
    configId: crypto.randomUUID(),
    status: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    secrets,
    summary
  };
}

// Calculate summary statistics from secrets
function calculateSummary(secrets: Secret[]) {
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

// Set Supabase credentials for Edge Function
const supabaseUrl = "https://ffxgtodowddzxlqraxlt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmeGd0b2Rvd2RkenhscXJheGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1OTE4MTMsImV4cCI6MjA2MDE2NzgxM30.SsTedFa8hb1vlEGR0IYjCPAzNvLBduXnHXalWjRT0w8";

// Create Supabase client for the edge function
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Main handler function
serve(async (req) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  try {
    const { repositoryUrl, scannerTypes } = await req.json();
    
    if (!repositoryUrl) {
      return new Response(
        JSON.stringify({ error: "Repository URL is required" }),
        { headers, status: 400 }
      );
    }

    if (!scannerTypes || !Array.isArray(scannerTypes) || scannerTypes.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one scanner type is required" }),
        { headers, status: 400 }
      );
    }

    // Extract repository name from URL for mock data
    const repoName = repositoryUrl.split('/').pop()?.replace('.git', '') || 'unknown';
    
    // Create a repository record
    const { data: repoData, error: repoError } = await supabase
      .from('repositories')
      .insert([
        { 
          name: repoName,
          url: repositoryUrl,
          last_scanned_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (repoError) {
      console.error("Error creating repository record:", repoError);
      // Fallback to using a random ID if DB insert fails
      const mockScan = generateMockScan(crypto.randomUUID(), scannerTypes);
      return new Response(JSON.stringify(mockScan), { headers });
    }
    
    // Generate mock scan result
    const mockScan = generateMockScan(repoData.id, scannerTypes);
    
    // Store scan result in database
    const { error: scanError } = await supabase
      .from('scan_results')
      .insert([
        {
          repository_id: repoData.id,
          status: mockScan.status,
          started_at: mockScan.startedAt,
          completed_at: mockScan.completedAt,
          secrets: mockScan.secrets,
          summary: mockScan.summary
        }
      ]);
      
    if (scanError) {
      console.error("Error storing scan result:", scanError);
    }
    
    // Return the mock scan result
    return new Response(JSON.stringify(mockScan), { headers });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { headers, status: 500 }
    );
  }
});

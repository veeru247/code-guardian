
import { Secret, ScanSummary } from "./types.ts";
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

// Function to clone a git repository to a temporary directory
export async function cloneRepository(repoUrl: string): Promise<string> {
  console.log("Starting repository clone process for:", repoUrl);
  
  // Create a temporary directory for the repo
  const tempDir = await Deno.makeTempDir();
  console.log("Created temporary directory:", tempDir);
  
  try {
    // Clone the repository with depth 1 to make it faster
    const command = new Deno.Command("git", {
      args: ["clone", "--depth", "1", repoUrl, tempDir],
    });
    
    console.log("Executing git clone command");
    const output = await command.output();
    
    if (!output.success) {
      const errorText = new TextDecoder().decode(output.stderr);
      console.error("Git clone failed:", errorText);
      throw new Error(`Failed to clone repository: ${errorText}`);
    }
    
    console.log("Repository cloned successfully to:", tempDir);
    return tempDir;
  } catch (error) {
    console.error("Exception during git clone:", error);
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

// Helper function to clean up temporary directories
export async function cleanupTempDir(path: string): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
    console.log("Temporary directory cleaned up:", path);
  } catch (error) {
    console.error("Error cleaning up repository:", error);
  }
}

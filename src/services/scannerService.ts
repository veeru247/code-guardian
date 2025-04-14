
import { v4 } from '@/lib/utils';
import { 
  Repository, 
  ScanResult, 
  ScannerType,
  Secret,
  RepositoryFile
} from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Transform data from database format to application format
const transformDbScanResult = (dbResult: any): ScanResult => {
  return {
    id: dbResult.id,
    repositoryId: dbResult.repository_id,
    configId: dbResult.config_id || '',
    status: dbResult.status,
    startedAt: dbResult.started_at,
    completedAt: dbResult.completed_at,
    secrets: (dbResult.secrets as any[] || []).map((s: any) => s as Secret),
    summary: dbResult.summary as ScanResult['summary'],
    files: (dbResult.files as any[] || []).map((f: any) => f as RepositoryFile),
    errorMessage: dbResult.error_message || null
  };
};

// Transform database repository to application format
const transformDbRepository = (dbRepo: any): Repository => {
  return {
    id: dbRepo.id,
    name: dbRepo.name,
    url: dbRepo.url,
    branch: dbRepo.branch,
    lastScannedAt: dbRepo.last_scanned_at,
  };
};

// Run repository scan using Supabase Edge Function
export const scanRepository = async (
  repositoryUrl: string, 
  scannerTypes: ScannerType[]
): Promise<ScanResult> => {
  console.log(`Scanning repository: ${repositoryUrl} with scanners: ${scannerTypes.join(', ')}`);
  
  try {
    // Validate inputs
    if (!repositoryUrl || !repositoryUrl.trim()) {
      throw new Error('Repository URL is required');
    }
    
    if (!scannerTypes || scannerTypes.length === 0) {
      throw new Error('At least one scanner type must be selected');
    }
    
    // Currently, we only support GitHub repositories
    if (!repositoryUrl.includes('github.com')) {
      throw new Error('Currently only GitHub repositories are supported');
    }
    
    // Validate that it's a valid GitHub repository URL
    const githubRegex = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/;
    if (!githubRegex.test(repositoryUrl)) {
      throw new Error('Invalid GitHub repository URL. Please use format: https://github.com/username/repository');
    }
    
    // Call the Supabase Edge Function to perform the scan
    const { data, error } = await supabase.functions.invoke('scan-repository', {
      body: {
        repositoryUrl,
        scannerTypes
      }
    });
    
    if (error) {
      console.error('Error invoking Edge Function:', error);
      throw new Error(`Error calling scan-repository function: ${error.message || 'Unknown error'}`);
    }
    
    if (!data) {
      throw new Error('No data returned from scan-repository function');
    }
    
    // Transform the data to match ScanResult type
    const scanResult = transformDbScanResult(data);
    
    // If scan failed, throw an error with the message
    if (scanResult.status === 'failed' && scanResult.errorMessage) {
      throw new Error(scanResult.errorMessage);
    }
    
    return scanResult;
  } catch (error) {
    console.error('Error scanning repository:', error);
    throw error;
  }
};

// Scan local files uploaded from user's machine
export const scanLocalFiles = async (
  files: File[], 
  scannerTypes: ScannerType[]
): Promise<ScanResult> => {
  console.log(`Scanning ${files.length} local files with scanners: ${scannerTypes.join(', ')}`);
  
  try {
    // Validate inputs
    if (!files || files.length === 0) {
      throw new Error('Files are required for scanning');
    }
    
    if (!scannerTypes || scannerTypes.length === 0) {
      throw new Error('At least one scanner type must be selected');
    }
    
    // Process files for scanning
    const processedFiles = await Promise.all(files.map(async (file) => {
      // Read file content
      const content = await readFileAsText(file);
      
      return {
        name: file.name,
        content,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      };
    }));
    
    // Call the Supabase Edge Function to perform the scan on local files
    const { data, error } = await supabase.functions.invoke('scan-local-files', {
      body: {
        files: processedFiles,
        scannerTypes
      }
    });
    
    if (error) {
      console.error('Error invoking Edge Function for local files:', error);
      throw new Error(`Error scanning local files: ${error.message || 'Unknown error'}`);
    }
    
    if (!data) {
      throw new Error('No data returned from scan-local-files function');
    }
    
    // Transform the data to match ScanResult type
    const scanResult = transformDbScanResult(data);
    
    // If scan failed, throw an error with the message
    if (scanResult.status === 'failed' && scanResult.errorMessage) {
      throw new Error(scanResult.errorMessage);
    }
    
    return scanResult;
  } catch (error) {
    console.error('Error scanning local files:', error);
    throw error;
  }
};

// Helper function to read file content as text
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
  });
};

// Extract repository name from URL for better UX
const extractRepoName = (url: string): string => {
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
};

// Get information about repositories that have been scanned
export const getRepositories = async (): Promise<Repository[]> => {
  try {
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .order('last_scanned_at', { ascending: false });
      
    if (error) throw error;
    
    // Transform the data to match Repository type
    return (data || []).map(transformDbRepository);
  } catch (error) {
    console.error('Error getting repositories:', error);
    return [];
  }
};

// Get all scan results
export const getScanResults = async (repositoryId?: string): Promise<ScanResult[]> => {
  try {
    let query = supabase
      .from('scan_results')
      .select('*')
      .order('started_at', { ascending: false });
      
    if (repositoryId) {
      query = query.eq('repository_id', repositoryId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Transform the data to match ScanResult type
    return (data || []).map(transformDbScanResult);
  } catch (error) {
    console.error('Error getting scan results:', error);
    return [];
  }
};

// Get a specific scan result by ID
export const getScanResult = async (scanId: string): Promise<ScanResult | null> => {
  try {
    const { data, error } = await supabase
      .from('scan_results')
      .select('*')
      .eq('id', scanId)
      .single();
      
    if (error) throw error;
    
    // Transform the data to match ScanResult type
    return data ? transformDbScanResult(data) : null;
  } catch (error) {
    console.error('Error getting scan result:', error);
    return null;
  }
};

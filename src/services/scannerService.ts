
import { v4 } from '@/lib/utils';
import { 
  Repository, 
  ScanResult, 
  ScannerType, 
  Secret
} from '@/types';
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase credentials are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key are required. Please make sure you have set the environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// Create Supabase client only if credentials are available
const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Run repository scan using Supabase Edge Function
export const scanRepository = async (
  repositoryUrl: string, 
  scannerTypes: ScannerType[]
): Promise<ScanResult> => {
  console.log(`Scanning repository: ${repositoryUrl} with scanners: ${scannerTypes.join(', ')}`);
  
  // Check if Supabase client is available
  if (!supabase) {
    throw new Error('Supabase client is not initialized. Please make sure you have set the environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('scan-repository', {
      body: {
        repositoryUrl,
        scannerTypes
      }
    });
    
    if (error) {
      console.error('Error invoking Edge Function:', error);
      throw new Error(error.message);
    }
    
    return data as ScanResult;
  } catch (error) {
    console.error('Error scanning repository:', error);
    throw error;
  }
};

// Get information about repositories that have been scanned
export const getRepositories = async (): Promise<Repository[]> => {
  // Check if Supabase client is available
  if (!supabase) {
    console.error('Supabase client is not initialized. Using mock data instead.');
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('repositories')
      .select('*');
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting repositories:', error);
    return [];
  }
};

// Get all scan results
export const getScanResults = async (repositoryId?: string): Promise<ScanResult[]> => {
  // Check if Supabase client is available
  if (!supabase) {
    console.error('Supabase client is not initialized. Using mock data instead.');
    return [];
  }
  
  try {
    let query = supabase
      .from('scan_results')
      .select('*');
      
    if (repositoryId) {
      query = query.eq('repositoryId', repositoryId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting scan results:', error);
    return [];
  }
};

// Get a specific scan result by ID
export const getScanResult = async (scanId: string): Promise<ScanResult | null> => {
  // Check if Supabase client is available
  if (!supabase) {
    console.error('Supabase client is not initialized. Using mock data instead.');
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('scan_results')
      .select('*')
      .eq('id', scanId)
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting scan result:', error);
    return null;
  }
};

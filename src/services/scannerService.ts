
import { v4 } from '@/lib/utils';
import { 
  Repository, 
  ScanResult, 
  ScannerType, 
  Secret
} from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Run repository scan using Supabase Edge Function
export const scanRepository = async (
  repositoryUrl: string, 
  scannerTypes: ScannerType[]
): Promise<ScanResult> => {
  console.log(`Scanning repository: ${repositoryUrl} with scanners: ${scannerTypes.join(', ')}`);
  
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

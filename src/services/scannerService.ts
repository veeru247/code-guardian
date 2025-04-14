
import { v4 } from '@/lib/utils';
import { 
  Repository, 
  ScanResult, 
  ScannerType, 
  Secret
} from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

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
    
    // Transform the data to match ScanResult type
    const scanResult = transformDbScanResult(data);
    return scanResult;
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
      .select('*');
      
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

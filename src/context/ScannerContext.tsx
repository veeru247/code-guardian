
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  Repository, 
  ScanResult, 
  ScannerType
} from '@/types';
import { 
  scanRepository, 
  scanLocalFiles, 
  getScanResults, 
  getRepositories 
} from '@/services/scannerService';
import { toast } from '@/hooks/use-toast';

interface ScannerContextType {
  repositories: Repository[];
  scanResults: ScanResult[];
  currentScan: ScanResult | null;
  isScanning: boolean;
  scanProgress: number; // Add the missing scanProgress property
  startScan: (repositoryUrl: string, scannerTypes: ScannerType[]) => Promise<void>;
  startLocalScan: (files: File[], scannerTypes: ScannerType[]) => Promise<void>;
  selectScan: (scanId: string) => void;
  refreshData: () => Promise<void>;
}

const ScannerContext = createContext<ScannerContextType | undefined>(undefined);

export const ScannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [currentScan, setCurrentScan] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0); // Add state for scan progress
  
  // Fetch initial data
  useEffect(() => {
    refreshData();
  }, []);
  
  // Progress simulation for better UX
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (isScanning) {
      setScanProgress(0);
      
      interval = setInterval(() => {
        setScanProgress(prev => {
          // Gradually increase up to 90% (the last 10% will be set when scan completes)
          if (prev < 90) {
            return prev + (Math.random() * 5);
          }
          return prev;
        });
      }, 800);
    } else if (scanProgress < 100 && scanProgress > 0) {
      // When scanning finishes, set progress to 100%
      setScanProgress(100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanning]);
  
  // Refresh repositories and scan results data
  const refreshData = async () => {
    try {
      const [repoData, scanData] = await Promise.all([
        getRepositories(),
        getScanResults()
      ]);
      
      setRepositories(repoData);
      setScanResults(scanData);
      
      // Set the most recent scan as current
      if (scanData.length > 0 && !currentScan) {
        setCurrentScan(scanData[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch scan data',
        variant: 'destructive',
      });
    }
  };
  
  // Start a repository scan
  const startScan = async (repositoryUrl: string, scannerTypes: ScannerType[]) => {
    try {
      setIsScanning(true);
      setScanProgress(5); // Set initial progress
      
      toast({
        title: 'Scan Started',
        description: 'Repository scan has been initiated',
      });
      
      const result = await scanRepository(repositoryUrl, scannerTypes);
      
      setCurrentScan(result);
      await refreshData();
      
      toast({
        title: 'Scan Complete',
        description: `Found ${result.summary.totalSecrets} secrets in the repository`,
      });
    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsScanning(false);
      setScanProgress(100); // Set final progress
    }
  };
  
  // Start a local files scan
  const startLocalScan = async (files: File[], scannerTypes: ScannerType[]) => {
    try {
      setIsScanning(true);
      setScanProgress(5); // Set initial progress
      
      toast({
        title: 'Scan Started',
        description: `Scanning ${files.length} local files`,
      });
      
      const result = await scanLocalFiles(files, scannerTypes);
      
      setCurrentScan(result);
      await refreshData();
      
      toast({
        title: 'Scan Complete',
        description: `Found ${result.summary.totalSecrets} secrets in ${files.length} files`,
      });
    } catch (error) {
      console.error('Local scan error:', error);
      toast({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsScanning(false);
      setScanProgress(100); // Set final progress
    }
  };
  
  // Select a specific scan to view
  const selectScan = (scanId: string) => {
    const scan = scanResults.find(s => s.id === scanId);
    if (scan) {
      setCurrentScan(scan);
    }
  };
  
  const value = {
    repositories,
    scanResults,
    currentScan,
    isScanning,
    scanProgress, // Add scanProgress to the context value
    startScan,
    startLocalScan,
    selectScan,
    refreshData
  };
  
  return (
    <ScannerContext.Provider value={value}>
      {children}
    </ScannerContext.Provider>
  );
};

export const useScanner = () => {
  const context = useContext(ScannerContext);
  if (context === undefined) {
    throw new Error('useScanner must be used within a ScannerProvider');
  }
  return context;
};


import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Repository, 
  ScanConfig, 
  ScanResult, 
  ScannerType, 
  Secret 
} from '@/types';
import * as mockDataService from '@/services/mockDataService';
import { toast } from "@/hooks/use-toast";

interface ScannerContextValue {
  repositories: Repository[];
  scanResults: ScanResult[];
  currentScan: ScanResult | null;
  isScanning: boolean;
  scannerTypes: ScannerType[];
  selectedScannerTypes: ScannerType[];
  toggleScannerType: (type: ScannerType) => void;
  startNewScan: (repositoryUrl: string) => Promise<void>;
  loadRepositories: () => Promise<void>;
  loadScanResults: (repositoryId?: string) => Promise<void>;
  getScanResult: (scanId: string) => Promise<void>;
  scanProgress: number;
}

const ScannerContext = createContext<ScannerContextValue | undefined>(undefined);

export const ScannerProvider = ({ children }: { children: ReactNode }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [currentScan, setCurrentScan] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [selectedScannerTypes, setSelectedScannerTypes] = useState<ScannerType[]>(['trufflehog', 'gitleaks']);
  const [scanProgress, setScanProgress] = useState<number>(0);

  const availableScannerTypes: ScannerType[] = ['trufflehog', 'gitleaks', 'custom'];

  const loadRepositories = async () => {
    try {
      const repos = await mockDataService.getRepositories();
      setRepositories(repos);
    } catch (error) {
      console.error('Failed to load repositories:', error);
      toast({
        title: "Error",
        description: "Failed to load repositories",
        variant: "destructive",
      });
    }
  };

  const loadScanResults = async (repositoryId?: string) => {
    try {
      const results = await mockDataService.getScanResults(repositoryId);
      setScanResults(results);
    } catch (error) {
      console.error('Failed to load scan results:', error);
      toast({
        title: "Error",
        description: "Failed to load scan results",
        variant: "destructive",
      });
    }
  };

  const getScanResult = async (scanId: string) => {
    try {
      const result = await mockDataService.getScanResult(scanId);
      if (result) {
        setCurrentScan(result);
      }
    } catch (error) {
      console.error('Failed to get scan result:', error);
      toast({
        title: "Error",
        description: "Failed to get scan result",
        variant: "destructive",
      });
    }
  };

  const toggleScannerType = (type: ScannerType) => {
    setSelectedScannerTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const startNewScan = async (repositoryUrl: string) => {
    if (selectedScannerTypes.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one scanner type",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format
    try {
      new URL(repositoryUrl);
    } catch (e) {
      toast({
        title: "Invalid Repository URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);

    // Simulate scanning progress
    const interval = setInterval(() => {
      setScanProgress(prev => {
        const newProgress = prev + Math.floor(Math.random() * 10);
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, 500);

    try {
      // Start the scan with the provided repository URL
      const scanResult = await mockDataService.startScan(repositoryUrl, selectedScannerTypes);
      
      // Ensure we get to 100% in UI before completing
      setTimeout(() => {
        clearInterval(interval);
        setScanProgress(100);
        setCurrentScan(scanResult);
        setScanResults(prev => [scanResult, ...prev]);
        
        // Update repositories list
        loadRepositories();
        
        setTimeout(() => {
          setIsScanning(false);
          toast({
            title: "Scan Completed",
            description: `Found ${scanResult.summary.totalSecrets} secrets in the repository ${scanResult.repositoryId}`,
          });
        }, 500);
      }, 3000);
    } catch (error) {
      clearInterval(interval);
      setIsScanning(false);
      console.error('Failed to start scan:', error);
      toast({
        title: "Scan Failed",
        description: "There was an error scanning the repository",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadRepositories();
    loadScanResults();
  }, []);

  const value: ScannerContextValue = {
    repositories,
    scanResults,
    currentScan,
    isScanning,
    scannerTypes: availableScannerTypes,
    selectedScannerTypes,
    toggleScannerType,
    startNewScan,
    loadRepositories,
    loadScanResults,
    getScanResult,
    scanProgress,
  };

  return <ScannerContext.Provider value={value}>{children}</ScannerContext.Provider>;
};

export const useScanner = () => {
  const context = useContext(ScannerContext);
  if (context === undefined) {
    throw new Error('useScanner must be used within a ScannerProvider');
  }
  return context;
};


import { useState } from 'react';
import { useScanner } from '@/context/ScannerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScannerType } from '@/types';
import { Check, FolderGit, Play, Shield, AlertTriangle } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from '@/components/ui/alert';

export const RepositoryForm = () => {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const { startNewScan, isScanning, scannerTypes, selectedScannerTypes, toggleScannerType } = useScanner();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedUrl = repositoryUrl.trim();
    if (!trimmedUrl) {
      toast({
        title: "Validation Error",
        description: "Please enter a repository URL",
        variant: "destructive",
      });
      return;
    }
    
    // Basic URL validation
    let isValidUrl = false;
    try {
      const url = new URL(trimmedUrl);
      isValidUrl = url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
      isValidUrl = false;
    }
    
    if (!isValidUrl) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid repository URL (http:// or https://)",
        variant: "destructive",
      });
      return;
    }
    
    // Validate for GitHub repositories
    if (!trimmedUrl.includes('github.com')) {
      toast({
        title: "GitHub Only",
        description: "Currently only GitHub repositories are supported.",
        variant: "destructive",
      });
      return;
    }
    
    // More informative message for the user
    toast({
      title: "Starting Scan",
      description: "Beginning the scan process. This may take a few minutes depending on repository size.",
    });
    
    try {
      await startNewScan(trimmedUrl);
    } catch (error) {
      console.error('Error starting scan:', error);
      toast({
        title: "Error",
        description: `Failed to start the scan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white mb-2">Scan a Git Repository</h2>
        <p className="text-gray-400">Enter the URL of a GitHub repository to scan for secrets and sensitive information.</p>
      </div>
      
      <Alert className="mb-4 border-scanner-primary bg-scanner-primary/10">
        <AlertTriangle className="h-4 w-4 text-scanner-primary" />
        <AlertDescription className="text-sm text-gray-300">
          This application scans GitHub repositories for secrets using the GitHub API and advanced pattern matching.
          It can take several minutes to complete depending on repository size.
        </AlertDescription>
      </Alert>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col">
          <label htmlFor="repositoryUrl" className="text-sm font-medium mb-2 text-gray-300">
            Repository URL
          </label>
          <div className="flex relative">
            <FolderGit className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              id="repositoryUrl"
              placeholder="https://github.com/username/repository"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              className="pl-10 bg-scanner-dark border-scanner-secondary text-white focus:border-scanner-primary"
              disabled={isScanning}
              required
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Currently only GitHub repositories are supported. Use the full GitHub URL (e.g., https://github.com/username/repository)
          </p>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Scanner Tools</label>
          <div className="flex flex-wrap gap-2">
            {scannerTypes.map((type) => (
              <Button
                key={type}
                type="button"
                variant="outline"
                className={`flex items-center ${
                  selectedScannerTypes.includes(type) 
                    ? 'bg-scanner-primary text-white border-scanner-primary' 
                    : 'bg-scanner-dark text-gray-300 border-scanner-secondary'
                }`}
                onClick={() => toggleScannerType(type)}
                disabled={isScanning}
              >
                {selectedScannerTypes.includes(type) && (
                  <Check className="mr-2 h-4 w-4" />
                )}
                <Shield className="mr-2 h-4 w-4" />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Select at least one scanner tool. Each tool uses different techniques to identify potential secrets.
          </p>
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-scanner-primary hover:bg-scanner-secondary text-white"
          disabled={isScanning || selectedScannerTypes.length === 0}
        >
          <Play className="mr-2 h-4 w-4" />
          {isScanning ? 'Scanning...' : 'Start Scan'}
        </Button>
      </form>
    </div>
  );
};

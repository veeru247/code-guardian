
import { useState } from 'react';
import { useScanner } from '@/context/ScannerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScannerType } from '@/types';
import { Check, FolderGit, Play, Shield } from 'lucide-react';
import { toast } from "@/hooks/use-toast";

export const RepositoryForm = () => {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const { startNewScan, isScanning, scannerTypes, selectedScannerTypes, toggleScannerType } = useScanner();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!repositoryUrl.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a repository URL",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await startNewScan(repositoryUrl);
    } catch (error) {
      console.error('Error starting scan:', error);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white mb-2">Scan a Git Repository</h2>
        <p className="text-gray-400">Enter the URL of a Git repository to scan for secrets and sensitive information.</p>
      </div>
      
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

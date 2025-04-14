
import { useScanner } from '@/context/ScannerContext';
import { Progress } from '@/components/ui/progress';
import { Loader } from 'lucide-react';

export const ScanProgress = () => {
  const { isScanning, scanProgress } = useScanner();
  
  if (!isScanning) {
    return null;
  }
  
  return (
    <div className="w-full bg-scanner-dark border border-scanner-secondary rounded-lg p-4 my-6 relative overflow-hidden">
      <div className="flex items-center mb-2">
        <Loader className="animate-spin h-5 w-5 mr-2 text-scanner-primary" />
        <h3 className="text-lg font-medium text-white">Scanning Repository</h3>
      </div>
      
      <p className="text-sm text-gray-400 mb-4">
        Please wait while we scan the repository for secrets and sensitive information...
      </p>
      
      <div className="relative">
        <Progress value={scanProgress} className="h-2 bg-scanner-secondary" />
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="scan-line" />
        </div>
      </div>
      
      <div className="mt-2 text-right text-sm text-gray-400">
        {scanProgress}% complete
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-scanner-bg/50 p-3 rounded">
          <p className="text-xs text-gray-400">Finding secrets</p>
        </div>
        <div className="bg-scanner-bg/50 p-3 rounded">
          <p className="text-xs text-gray-400">Analyzing potential leaks</p>
        </div>
        <div className="bg-scanner-bg/50 p-3 rounded">
          <p className="text-xs text-gray-400">Scanning commit history</p>
        </div>
        <div className="bg-scanner-bg/50 p-3 rounded">
          <p className="text-xs text-gray-400">Checking sensitive files</p>
        </div>
      </div>
    </div>
  );
};

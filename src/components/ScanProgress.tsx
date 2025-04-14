
import { useScanner } from '@/context/ScannerContext';
import { Progress } from '@/components/ui/progress';
import { Loader, CheckCheck, AlertTriangle, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ScanProgress = () => {
  const { isScanning, scanProgress, currentScan } = useScanner();
  
  if (!isScanning && !currentScan) {
    return null;
  }
  
  // Determine status
  const status = currentScan?.status || (isScanning ? 'scanning' : 'completed');
  const isComplete = status === 'completed';
  const isFailed = status === 'failed';
  const errorMessage = currentScan?.errorMessage;
  
  const getStepStatus = (step: number) => {
    if (isFailed) return 'failed';
    if (isComplete) return 'completed';
    if (scanProgress < 25 && step === 1) return 'active';
    if (scanProgress >= 25 && scanProgress < 50 && step === 2) return 'active';
    if (scanProgress >= 50 && scanProgress < 75 && step === 3) return 'active';
    if (scanProgress >= 75 && step === 4) return 'active';
    if ((scanProgress >= 25 && step === 1) ||
        (scanProgress >= 50 && step === 2) ||
        (scanProgress >= 75 && step === 3)) return 'completed';
    return 'pending';
  };
  
  return (
    <div className="w-full bg-scanner-dark border border-scanner-secondary rounded-lg p-4 my-6 relative overflow-hidden">
      <div className="flex items-center mb-2">
        {isComplete ? (
          <CheckCheck className="h-5 w-5 mr-2 text-green-500" />
        ) : isFailed ? (
          <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
        ) : (
          <Loader className="animate-spin h-5 w-5 mr-2 text-scanner-primary" />
        )}
        
        <h3 className="text-lg font-medium text-white">
          {isFailed ? 'Scan Failed' : isComplete ? 'Scan Complete' : 'Scanning Repository'}
        </h3>
      </div>
      
      <p className="text-sm text-gray-400 mb-4">
        {isFailed ? (
          'There was an error while scanning the repository. Please check the details below.'
        ) : isComplete ? (
          'The repository has been scanned successfully. Results are available below.'
        ) : (
          'Please wait while we scan the repository. This process uses real scanning tools (TruffleHog and Gitleaks) and may take several minutes depending on the repository size...'
        )}
      </p>
      
      <div className="relative">
        <Progress 
          value={isFailed ? 100 : scanProgress} 
          className={`h-2 ${isFailed ? 'bg-red-900' : 'bg-scanner-secondary'}`}
          indicatorClassName={isFailed ? 'bg-red-500' : isComplete ? 'bg-green-500' : undefined}
        />
        
        {!isFailed && !isComplete && (
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="scan-line" />
          </div>
        )}
      </div>
      
      <div className="mt-2 text-right text-sm text-gray-400">
        {isFailed ? (
          'Failed'
        ) : isComplete ? (
          'Complete'
        ) : (
          `${scanProgress}% complete`
        )}
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className={`p-3 rounded flex items-center ${
          getStepStatus(1) === 'active' ? 'bg-scanner-primary/20 border border-scanner-primary' : 
          getStepStatus(1) === 'completed' ? 'bg-green-900/20 border border-green-800' :
          getStepStatus(1) === 'failed' ? 'bg-red-900/20 border border-red-800' :
          'bg-scanner-bg/50'
        }`}>
          {getStepStatus(1) === 'active' && <Loader className="animate-spin h-4 w-4 mr-2 text-scanner-primary" />}
          {getStepStatus(1) === 'completed' && <CheckCheck className="h-4 w-4 mr-2 text-green-500" />}
          {getStepStatus(1) === 'failed' && <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />}
          {getStepStatus(1) === 'pending' && <Clock className="h-4 w-4 mr-2 text-gray-500" />}
          <p className="text-xs text-gray-400">Accessing repository</p>
        </div>
        
        <div className={`p-3 rounded flex items-center ${
          getStepStatus(2) === 'active' ? 'bg-scanner-primary/20 border border-scanner-primary' : 
          getStepStatus(2) === 'completed' ? 'bg-green-900/20 border border-green-800' :
          getStepStatus(2) === 'failed' ? 'bg-red-900/20 border border-red-800' :
          'bg-scanner-bg/50'
        }`}>
          {getStepStatus(2) === 'active' && <Loader className="animate-spin h-4 w-4 mr-2 text-scanner-primary" />}
          {getStepStatus(2) === 'completed' && <CheckCheck className="h-4 w-4 mr-2 text-green-500" />}
          {getStepStatus(2) === 'failed' && <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />}
          {getStepStatus(2) === 'pending' && <Clock className="h-4 w-4 mr-2 text-gray-500" />}
          <p className="text-xs text-gray-400">Running TruffleHog scanner</p>
        </div>
        
        <div className={`p-3 rounded flex items-center ${
          getStepStatus(3) === 'active' ? 'bg-scanner-primary/20 border border-scanner-primary' : 
          getStepStatus(3) === 'completed' ? 'bg-green-900/20 border border-green-800' :
          getStepStatus(3) === 'failed' ? 'bg-red-900/20 border border-red-800' :
          'bg-scanner-bg/50'
        }`}>
          {getStepStatus(3) === 'active' && <Loader className="animate-spin h-4 w-4 mr-2 text-scanner-primary" />}
          {getStepStatus(3) === 'completed' && <CheckCheck className="h-4 w-4 mr-2 text-green-500" />}
          {getStepStatus(3) === 'failed' && <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />}
          {getStepStatus(3) === 'pending' && <Clock className="h-4 w-4 mr-2 text-gray-500" />}
          <p className="text-xs text-gray-400">Running Gitleaks scanner</p>
        </div>
        
        <div className={`p-3 rounded flex items-center ${
          getStepStatus(4) === 'active' ? 'bg-scanner-primary/20 border border-scanner-primary' : 
          getStepStatus(4) === 'completed' ? 'bg-green-900/20 border border-green-800' :
          getStepStatus(4) === 'failed' ? 'bg-red-900/20 border border-red-800' :
          'bg-scanner-bg/50'
        }`}>
          {getStepStatus(4) === 'active' && <Loader className="animate-spin h-4 w-4 mr-2 text-scanner-primary" />}
          {getStepStatus(4) === 'completed' && <CheckCheck className="h-4 w-4 mr-2 text-green-500" />}
          {getStepStatus(4) === 'failed' && <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />}
          {getStepStatus(4) === 'pending' && <Clock className="h-4 w-4 mr-2 text-gray-500" />}
          <p className="text-xs text-gray-400">Analyzing results</p>
        </div>
      </div>
      
      {isFailed && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded">
          <p className="text-sm text-red-400 mb-2">
            <strong>Error Details:</strong> {errorMessage || "The scan process encountered an error. This could be due to repository access issues or limitations in the scanning tools."}
          </p>
          
          <div className="mt-2 text-sm text-gray-300">
            <p className="mb-2"><strong>Possible solutions:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Verify the repository URL is correct</li>
              <li>Ensure the repository is public and accessible</li>
              <li>Try scanning with a smaller repository first</li>
              <li>If you continue to have issues, you may be hitting GitHub API rate limits</li>
            </ul>
          </div>
        </div>
      )}
      
      {isComplete && currentScan?.files && currentScan.files.length > 0 && (
        <div className="mt-4 p-3 bg-green-900/20 border border-green-800 rounded flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-4 w-4 mr-2 text-green-500" />
            <p className="text-sm text-green-400">
              Successfully fetched {currentScan.files.length} files from the repository
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

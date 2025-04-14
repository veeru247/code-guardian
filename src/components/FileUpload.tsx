
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Upload, File, X } from 'lucide-react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  className?: string;
}

export const FileUpload = ({
  onFilesSelected,
  maxFiles = 100,
  maxSizeMB = 10,
  className = '',
}: FileUploadProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    
    setError(null);
    
    // Convert FileList to File array
    const filesArray = Array.from(fileList);
    
    // Check number of files
    if (filesArray.length > maxFiles) {
      setError(`You can only upload a maximum of ${maxFiles} files at once`);
      return;
    }
    
    // Check file sizes
    const oversizedFiles = filesArray.filter(file => file.size > maxSizeBytes);
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the maximum size of ${maxSizeMB}MB`);
      return;
    }
    
    setSelectedFiles(prevFiles => [...prevFiles, ...filesArray]);
    
    // Notify parent component
    onFilesSelected([...selectedFiles, ...filesArray]);
    
    // Reset the input
    e.target.value = '';
  };
  
  const removeFile = (index: number) => {
    const updatedFiles = [...selectedFiles];
    updatedFiles.splice(index, 1);
    setSelectedFiles(updatedFiles);
    
    // Notify parent component
    onFilesSelected(updatedFiles);
  };
  
  const clearFiles = () => {
    setSelectedFiles([]);
    onFilesSelected([]);
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Input
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            accept="text/*,.py,.js,.ts,.jsx,.tsx,.json,.yaml,.yml,.xml,.env,.config,.md,.txt,.html,.css,.scss"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer border-2 border-dashed border-scanner-secondary rounded-md p-4 w-full flex flex-col items-center justify-center hover:bg-scanner-dark/50 transition-colors"
          >
            <Upload className="h-8 w-8 text-scanner-primary mb-2" />
            <p className="text-white font-medium">Upload Files</p>
            <p className="text-gray-400 text-sm">
              Drag and drop or click to select files
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Max {maxFiles} files, {maxSizeMB}MB each
            </p>
          </label>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
      
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-white font-medium">
              Selected Files ({selectedFiles.length})
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFiles}
              className="text-scanner-danger hover:text-scanner-danger hover:bg-scanner-danger/10"
            >
              Clear All
            </Button>
          </div>
          
          <div className="bg-scanner-dark border border-scanner-secondary rounded-md max-h-60 overflow-y-auto">
            <ul className="divide-y divide-scanner-secondary">
              {selectedFiles.map((file, index) => (
                <li key={index} className="p-2 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <File className="h-4 w-4 text-scanner-primary" />
                    <span className="text-white text-sm">{file.name}</span>
                    <span className="text-gray-400 text-xs">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    className="h-6 w-6 rounded-full text-gray-400 hover:text-scanner-danger"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

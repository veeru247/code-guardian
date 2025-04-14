
import { useState } from 'react';
import { useScanner } from '@/context/ScannerContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, ChevronRight, File, FileText, Folder, FolderOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { parseRepoName } from '@/lib/utils';

interface RepositoryFile {
  path: string;
  content: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: string;
}

export const RepositoryFiles = () => {
  const { currentScan } = useScanner();
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  
  if (!currentScan || !currentScan.files || currentScan.files.length === 0) {
    return (
      <Alert className="bg-scanner-dark border-scanner-secondary">
        <AlertCircle className="h-4 w-4 text-scanner-primary" />
        <AlertTitle className="text-white">No repository files available</AlertTitle>
        <AlertDescription className="text-gray-400">
          No files were found in this repository scan. This could be due to an error in accessing the repository or the scan is still in progress.
        </AlertDescription>
      </Alert>
    );
  }

  // Filter and sort files to display directories first
  const sortedFiles = [...currentScan.files].sort((a, b) => {
    // Sort directories first
    if (a.type === 'directory' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'directory') return 1;
    
    // Then sort alphabetically by path
    return a.path.localeCompare(b.path);
  });
  
  // Filter files to only show root level and directories to avoid clutter
  const rootFiles = sortedFiles.filter(file => 
    file.path.split('/').filter(part => part !== '').length === 1 || file.type === 'directory'
  );

  const handleViewFile = (file: RepositoryFile) => {
    setSelectedFile(file);
    setOpenDialog(true);
  };

  const formatFileSize = (size?: number) => {
    if (!size) return 'Unknown';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (file: RepositoryFile) => {
    if (file.type === 'directory') {
      return <FolderOpen className="h-4 w-4 text-scanner-warning" />;
    }
    
    // Check file extension
    const extension = file.path.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'java':
      case 'py':
      case 'rb':
      case 'php':
      case 'go':
      case 'rs':
      case 'c':
      case 'cpp':
      case 'h':
      case 'cs':
        return <FileText className="h-4 w-4 text-scanner-primary" />;
      case 'md':
      case 'txt':
      case 'log':
        return <FileText className="h-4 w-4 text-scanner-info" />;
      case 'json':
      case 'yml':
      case 'yaml':
      case 'xml':
      case 'toml':
      case 'ini':
      case 'env':
        return <FileText className="h-4 w-4 text-scanner-warning" />;
      default:
        return <File className="h-4 w-4 text-gray-400" />;
    }
  };

  // Function to highlight syntax in file content
  const highlightContent = (content: string, path: string) => {
    // Simple syntax highlighting based on file extension
    const extension = path.split('.').pop()?.toLowerCase();
    
    // For simplicity, just highlighting secrets for now
    // In a real implementation, you'd use a proper syntax highlighting library
    return content.split('\n').map((line, index) => {
      // Check for potential secrets in the line
      const containsSecret = currentScan.secrets.some(secret => 
        secret.filePath === path && secret.lineNumber === index + 1
      );
      
      const lineSecret = currentScan.secrets.find(secret => 
        secret.filePath === path && secret.lineNumber === index + 1
      );
      
      return (
        <div 
          key={index} 
          className={`${containsSecret ? 'bg-red-900/30 border-l-2 border-red-500' : ''} px-2 py-0.5 whitespace-pre text-sm`}
        >
          <span className="text-gray-500 inline-block w-8 text-right mr-3 select-none">
            {index + 1}
          </span>
          {line}
          {lineSecret && (
            <span className="ml-2 text-xs bg-red-900/50 text-white px-2 py-0.5 rounded">
              {lineSecret.secretType}
            </span>
          )}
        </div>
      );
    });
  };
  
  return (
    <div className="w-full space-y-6 mt-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Repository Files</h2>
          <p className="text-gray-400">
            Files from {parseRepoName(currentScan.repositoryId)}
          </p>
        </div>
      </div>
      
      <Card className="scanner-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-lg">File Browser</CardTitle>
          <CardDescription className="text-gray-400">
            Browse files in the repository to identify where secrets were found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-scanner-secondary hover:bg-scanner-dark/50">
                <TableHead className="text-scanner-gray">Name</TableHead>
                <TableHead className="text-scanner-gray">Type</TableHead>
                <TableHead className="text-scanner-gray">Size</TableHead>
                <TableHead className="text-scanner-gray w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rootFiles.length > 0 ? (
                rootFiles.map((file) => (
                  <TableRow key={file.path} className="border-scanner-secondary hover:bg-scanner-dark/50">
                    <TableCell className="font-medium text-white flex items-center">
                      {getFileIcon(file)}
                      <span className="ml-2">{file.path}</span>
                    </TableCell>
                    <TableCell className="text-scanner-gray">
                      {file.type === 'directory' ? 'Directory' : 'File'}
                    </TableCell>
                    <TableCell className="text-scanner-gray">
                      {file.type === 'file' ? formatFileSize(file.size) : '—'}
                    </TableCell>
                    <TableCell>
                      {file.type === 'file' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleViewFile(file)}
                          className="hover:bg-scanner-primary/20"
                        >
                          <ChevronRight className="h-4 w-4 text-scanner-primary" />
                          <span className="sr-only">View</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-gray-400">
                    No files available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* File content dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="bg-scanner-dark border-scanner-secondary text-white max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              {selectedFile && getFileIcon(selectedFile)}
              <span className="ml-2">{selectedFile?.path}</span>
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedFile?.type === 'file' && selectedFile?.size && (
                <span>File size: {formatFileSize(selectedFile.size)}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 border border-scanner-secondary rounded-md bg-black/30 p-2 mt-2 overflow-auto font-mono">
            {selectedFile?.content ? (
              <div className="code-content">
                {highlightContent(selectedFile.content, selectedFile.path)}
              </div>
            ) : (
              <div className="p-4 text-gray-400">No content available</div>
            )}
          </ScrollArea>
          
          {/* Display related secrets if any */}
          {selectedFile && currentScan.secrets.some(secret => secret.filePath === selectedFile.path) && (
            <div className="mt-4">
              <h4 className="text-white font-medium mb-2">Detected Secrets</h4>
              <div className="space-y-2">
                {currentScan.secrets
                  .filter(secret => secret.filePath === selectedFile.path)
                  .map(secret => (
                    <Alert key={secret.id} className="bg-red-900/20 border-red-800 py-2 text-sm">
                      <div className="flex justify-between">
                        <div>
                          <AlertTitle className="text-red-400">
                            {secret.secretType}
                          </AlertTitle>
                          <AlertDescription className="text-gray-300">
                            Line: {secret.lineNumber} - {secret.description}
                          </AlertDescription>
                        </div>
                        <div className="text-xs bg-red-800 px-2 py-1 rounded text-white uppercase">
                          {secret.severity}
                        </div>
                      </div>
                    </Alert>
                  ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

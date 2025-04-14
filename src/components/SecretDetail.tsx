
import { Secret } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, File, GitCommit, User, Calendar, AlertTriangle } from 'lucide-react';
import { formatDate, getSeverityClass } from '@/lib/utils';
import { toast } from "@/hooks/use-toast";

interface SecretDetailProps {
  secret: Secret;
  onClose: () => void;
}

export const SecretDetail = ({ secret, onClose }: SecretDetailProps) => {
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `Copied ${label}`,
      description: `${label} has been copied to your clipboard`,
    });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-scanner-dark border-scanner-secondary text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-white flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-scanner-primary" />
              {secret.secretType}
            </DialogTitle>
            <Badge className={getSeverityClass(secret.severity)}>
              {secret.severity.toUpperCase()}
            </Badge>
          </div>
          <DialogDescription className="text-gray-400">
            {secret.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Location details */}
          <div className="bg-scanner-bg rounded-md p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-300">Location Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center text-sm">
                <File className="h-4 w-4 mr-2 text-scanner-primary" />
                <span className="text-gray-300 mr-2">File:</span>
                <span className="text-white truncate">{secret.filePath}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto h-7 w-7 p-0" 
                  onClick={() => handleCopyToClipboard(secret.filePath, 'File path')}
                >
                  <Copy className="h-3 w-3 text-gray-400" />
                </Button>
              </div>
              <div className="flex items-center text-sm">
                <span className="text-gray-300 mr-2">Line:</span>
                <span className="text-white">{secret.lineNumber}</span>
              </div>
            </div>
          </div>

          {/* Commit details */}
          <div className="bg-scanner-bg rounded-md p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-300">Commit Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {secret.commit && (
                <div className="flex items-center text-sm">
                  <GitCommit className="h-4 w-4 mr-2 text-scanner-primary" />
                  <span className="text-gray-300 mr-2">Commit:</span>
                  <span className="text-white">{secret.commit}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-auto h-7 w-7 p-0" 
                    onClick={() => handleCopyToClipboard(secret.commit || '', 'Commit hash')}
                  >
                    <Copy className="h-3 w-3 text-gray-400" />
                  </Button>
                </div>
              )}
              {secret.author && (
                <div className="flex items-center text-sm">
                  <User className="h-4 w-4 mr-2 text-scanner-primary" />
                  <span className="text-gray-300 mr-2">Author:</span>
                  <span className="text-white">{secret.author}</span>
                </div>
              )}
              {secret.date && (
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-scanner-primary" />
                  <span className="text-gray-300 mr-2">Date:</span>
                  <span className="text-white">{formatDate(secret.date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Code snippet */}
          {secret.codeSnippet && (
            <div className="bg-scanner-bg rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">Code Snippet</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs text-scanner-primary hover:text-scanner-primary hover:bg-scanner-primary/10" 
                  onClick={() => handleCopyToClipboard(secret.codeSnippet || '', 'Code snippet')}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Code
                </Button>
              </div>
              <pre className="bg-scanner-dark p-3 rounded-md text-xs overflow-x-auto text-gray-300 border border-scanner-secondary">
                <code>{secret.codeSnippet}</code>
              </pre>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between mt-6 gap-4">
          <div className="text-sm text-gray-400">
            This security finding requires your attention.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              className="bg-scanner-primary hover:bg-scanner-secondary"
              onClick={() => {
                toast({
                  title: "Opening documentation",
                  description: "This would open remediation documentation in a real app",
                });
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Remediation
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

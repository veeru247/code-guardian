
import { useState } from 'react';
import { useScanner } from '@/context/ScannerContext';
import { Secret, SecretSeverity } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowDownToLine, Code, Copy, Eye, File, FileWarning } from 'lucide-react';
import { formatDate, getSeverityClass, parseRepoName } from '@/lib/utils';
import { SecretDetail } from './SecretDetail';
import { toast } from "@/hooks/use-toast";

export const ScanResults = () => {
  const { currentScan, isScanning } = useScanner();
  const [selectedSecret, setSelectedSecret] = useState<Secret | null>(null);
  
  if (isScanning || !currentScan) {
    return null;
  }
  
  const { secrets, summary } = currentScan;
  
  const handleCopyReport = () => {
    const reportText = `Scan Report for ${parseRepoName(currentScan.repositoryId)}
Date: ${formatDate(currentScan.startedAt)}

Summary:
- Total Secrets Found: ${summary.totalSecrets}
- High Severity: ${summary.highSeverity}
- Medium Severity: ${summary.mediumSeverity}
- Low Severity: ${summary.lowSeverity}
- Info: ${summary.infoSeverity}

${secrets.map((secret) => `
${secret.severity.toUpperCase()}: ${secret.secretType}
File: ${secret.filePath}
Line: ${secret.lineNumber}
Commit: ${secret.commit}
Author: ${secret.author}
Date: ${secret.date ? formatDate(secret.date) : 'Unknown'}
`).join('\n')}`;

    navigator.clipboard.writeText(reportText);
    toast({
      title: "Copied to clipboard",
      description: "Scan report has been copied to your clipboard",
    });
  };
  
  const handleDownloadReport = () => {
    // Create file content
    const reportText = `# Scan Report for ${parseRepoName(currentScan.repositoryId)}
Date: ${formatDate(currentScan.startedAt)}

## Summary
- Total Secrets Found: ${summary.totalSecrets}
- High Severity: ${summary.highSeverity}
- Medium Severity: ${summary.mediumSeverity}
- Low Severity: ${summary.lowSeverity}
- Info: ${summary.infoSeverity}

## Detailed Findings
${secrets.map((secret) => `
### ${secret.severity.toUpperCase()}: ${secret.secretType}
- File: ${secret.filePath}
- Line: ${secret.lineNumber}
- Commit: ${secret.commit}
- Author: ${secret.author}
- Date: ${secret.date ? formatDate(secret.date) : 'Unknown'}
- Description: ${secret.description}

\`\`\`
${secret.codeSnippet}
\`\`\`
`).join('\n')}`;
    
    // Create blob and download
    const blob = new Blob([reportText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan-report-${parseRepoName(currentScan.repositoryId).replace('/', '-')}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report Downloaded",
      description: "The scan report has been downloaded as a markdown file",
    });
  };
  
  // Filter secrets by severity
  const getSecretsBySeverity = (severity: SecretSeverity): Secret[] => {
    return secrets.filter(secret => secret.severity === severity);
  };
  
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Scan Results</h2>
          <p className="text-gray-400">
            Repository: {parseRepoName(currentScan.repositoryId)} | 
            Scan date: {formatDate(currentScan.startedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyReport}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Report
          </Button>
          <Button variant="default" className="bg-scanner-primary hover:bg-scanner-secondary" onClick={handleDownloadReport}>
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>
      
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-scanner-dark border-scanner-secondary">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-lg">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{summary.totalSecrets}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-scanner-dark border-scanner-danger">
          <CardHeader className="pb-2">
            <CardTitle className="text-scanner-danger text-lg">High</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-scanner-danger">{summary.highSeverity}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-scanner-dark border-scanner-warning">
          <CardHeader className="pb-2">
            <CardTitle className="text-scanner-warning text-lg">Medium</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-scanner-warning">{summary.mediumSeverity}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-scanner-dark border-scanner-info">
          <CardHeader className="pb-2">
            <CardTitle className="text-scanner-info text-lg">Low</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-scanner-info">{summary.lowSeverity}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-scanner-dark border-scanner-secondary">
          <CardHeader className="pb-2">
            <CardTitle className="text-scanner-gray text-lg">Info</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-scanner-gray">{summary.infoSeverity}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabbed results */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-scanner-dark border border-scanner-secondary grid grid-cols-5 mb-4">
          <TabsTrigger value="all">All ({summary.totalSecrets})</TabsTrigger>
          <TabsTrigger value="high">High ({summary.highSeverity})</TabsTrigger>
          <TabsTrigger value="medium">Medium ({summary.mediumSeverity})</TabsTrigger>
          <TabsTrigger value="low">Low ({summary.lowSeverity})</TabsTrigger>
          <TabsTrigger value="info">Info ({summary.infoSeverity})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          {secrets.length > 0 ? (
            <div className="space-y-4">
              {secrets.map((secret) => (
                <SecretCard 
                  key={secret.id}
                  secret={secret}
                  onClick={() => setSelectedSecret(secret)}
                />
              ))}
            </div>
          ) : (
            <NoSecretsFound />
          )}
        </TabsContent>
        
        {['high', 'medium', 'low', 'info'].map((severity) => (
          <TabsContent key={severity} value={severity}>
            {getSecretsBySeverity(severity as SecretSeverity).length > 0 ? (
              <div className="space-y-4">
                {getSecretsBySeverity(severity as SecretSeverity).map((secret) => (
                  <SecretCard 
                    key={secret.id}
                    secret={secret}
                    onClick={() => setSelectedSecret(secret)}
                  />
                ))}
              </div>
            ) : (
              <NoSecretsFound severity={severity as SecretSeverity} />
            )}
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Secret detail modal */}
      {selectedSecret && (
        <SecretDetail 
          secret={selectedSecret} 
          onClose={() => setSelectedSecret(null)} 
        />
      )}
    </div>
  );
};

const SecretCard = ({ secret, onClick }: { secret: Secret; onClick: () => void }) => {
  return (
    <Card className="scanner-card" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-white text-lg flex items-center">
              <FileWarning className="h-5 w-5 mr-2 text-scanner-primary" />
              {secret.secretType}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {secret.filePath}:{secret.lineNumber}
            </CardDescription>
          </div>
          <Badge className={getSeverityClass(secret.severity)}>
            {secret.severity.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="text-gray-300 text-sm">
        <p>{secret.description}</p>
      </CardContent>
      <CardFooter className="border-t border-scanner-secondary pt-3 flex justify-between text-xs text-gray-400">
        <div className="flex items-center">
          <Code className="h-3 w-3 mr-1" />
          {secret.commit ? secret.commit.substring(0, 7) : 'Unknown'} 
          {secret.date && ` • ${formatDate(secret.date)}`}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs text-scanner-primary hover:text-scanner-primary hover:bg-scanner-primary/10"
        >
          <Eye className="h-3 w-3 mr-1" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

const NoSecretsFound = ({ severity }: { severity?: SecretSeverity }) => {
  return (
    <Alert className="bg-scanner-dark border-scanner-secondary">
      <AlertCircle className="h-4 w-4 text-scanner-primary" />
      <AlertTitle className="text-white">No secrets found</AlertTitle>
      <AlertDescription className="text-gray-400">
        {severity 
          ? `No ${severity} severity secrets were detected in this repository.`
          : 'No secrets were detected in this repository.'}
      </AlertDescription>
    </Alert>
  );
};

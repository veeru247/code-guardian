
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useScanner } from '@/context/ScannerContext';
import { ChevronRight, Clock, FolderGit } from 'lucide-react';
import { formatDate, parseRepoName } from '@/lib/utils';

export const RecentScans = () => {
  const { scanResults, isScanning } = useScanner();
  
  if (scanResults.length === 0 || isScanning) {
    return null;
  }
  
  // Sort by date (newest first) and take up to 3
  const recentScans = [...scanResults]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 3);
  
  return (
    <div className="w-full my-8">
      <h2 className="text-xl font-semibold text-white mb-4">Recent Scans</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {recentScans.map((scan) => (
          <Card key={scan.id} className="scanner-card">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-white text-lg flex items-center">
                  <FolderGit className="h-4 w-4 mr-2 text-scanner-primary" />
                  {parseRepoName(scan.repositoryId)}
                </CardTitle>
                <Badge variant="outline" className="text-scanner-primary border-scanner-primary">
                  {scan.summary.totalSecrets} Secrets
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-gray-400 mb-3">
                <Clock className="h-3 w-3 mr-1" />
                {formatDate(scan.startedAt)}
              </div>
              
              <div className="flex space-x-2 mb-4">
                {scan.summary.highSeverity > 0 && (
                  <Badge className="scanner-badge-high">
                    {scan.summary.highSeverity} High
                  </Badge>
                )}
                {scan.summary.mediumSeverity > 0 && (
                  <Badge className="scanner-badge-medium">
                    {scan.summary.mediumSeverity} Medium
                  </Badge>
                )}
                {scan.summary.lowSeverity > 0 && (
                  <Badge className="scanner-badge-low">
                    {scan.summary.lowSeverity} Low
                  </Badge>
                )}
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-scanner-primary hover:text-scanner-primary hover:bg-scanner-primary/10 w-full justify-between"
                onClick={() => {}}
              >
                View Detailed Results
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

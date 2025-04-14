
import { v4 } from '@/lib/utils';
import { 
  Repository, 
  ScanResult, 
  ScannerType, 
  Secret,
  SecretSeverity
} from '@/types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Helper to generate scan results from command output
const parseSecrets = (output: string, scannerType: string, repoUrl: string): Secret[] => {
  try {
    if (!output || output.trim() === '') {
      return [];
    }
    
    // Each scanner has different output format
    if (scannerType === 'trufflehog') {
      try {
        // Trufflehog outputs JSON objects, one per line
        return output.split('\n')
          .filter(line => line.trim() !== '')
          .map(line => {
            try {
              const finding = JSON.parse(line);
              return {
                id: v4(),
                scanId: v4(),
                filePath: finding.SourceMetadata?.Data?.Filesystem?.file || finding.SourceMetadata?.Data?.Git?.file || 'Unknown',
                lineNumber: finding.SourceMetadata?.Data?.Filesystem?.line || finding.SourceMetadata?.Data?.Git?.line || 0,
                secretType: finding.DetectorType || 'Unknown',
                commit: finding.SourceMetadata?.Data?.Git?.commit || 'Unknown',
                author: finding.SourceMetadata?.Data?.Git?.email || 'Unknown',
                date: finding.SourceMetadata?.Data?.Git?.timestamp || new Date().toISOString(),
                severity: mapSeverity(finding.Severity),
                description: `${finding.DetectorType} secret found.`,
                codeSnippet: finding.Raw || finding.Secret || 'No snippet available',
              };
            } catch (e) {
              console.error('Error parsing trufflehog finding:', e);
              return null;
            }
          })
          .filter(Boolean) as Secret[];
      } catch (e) {
        console.error('Error parsing trufflehog output:', e);
        return [];
      }
    } else if (scannerType === 'gitleaks') {
      try {
        // Gitleaks can output JSON array
        const findings = JSON.parse(output);
        return findings.map((finding: any) => ({
          id: v4(),
          scanId: v4(),
          filePath: finding.file || 'Unknown',
          lineNumber: finding.startLine || finding.lineNumber || 0,
          secretType: finding.rule || finding.ruleId || 'Unknown',
          commit: finding.commit || 'Unknown',
          author: finding.author || finding.email || 'Unknown',
          date: finding.date || new Date().toISOString(),
          severity: mapSeverity(finding.severity || 'medium'),
          description: finding.description || `${finding.rule || 'Secret'} detected`,
          codeSnippet: finding.line || finding.excerpt || finding.secret || 'No snippet available',
        }));
      } catch (e) {
        console.error('Error parsing gitleaks output:', e);
        // Fallback to line parsing if JSON parsing fails
        return output.split('\n')
          .filter(line => line.trim() !== '')
          .map((line, index) => ({
            id: v4(),
            scanId: v4(),
            filePath: line.includes(':') ? line.split(':')[0] : 'Unknown',
            lineNumber: line.includes(':') ? parseInt(line.split(':')[1]) || 0 : 0,
            secretType: 'Secret',
            commit: 'Unknown',
            author: 'Unknown',
            date: new Date().toISOString(),
            severity: 'medium' as SecretSeverity,
            description: 'Secret detected by Gitleaks',
            codeSnippet: line,
          }));
      }
    } else if (scannerType === 'custom') {
      // Simple regex-based detection as a fallback custom scanner
      const secrets: Secret[] = [];
      const lines = output.split('\n');
      
      const patterns = [
        { regex: /password\s*[:=]\s*['"]([^'"]+)['"]/, type: 'Password', severity: 'high' as SecretSeverity },
        { regex: /api[_\-]?key\s*[:=]\s*['"]([^'"]+)['"]/, type: 'API Key', severity: 'high' as SecretSeverity },
        { regex: /secret\s*[:=]\s*['"]([^'"]+)['"]/, type: 'Secret', severity: 'medium' as SecretSeverity },
        { regex: /token\s*[:=]\s*['"]([^'"]+)['"]/, type: 'Token', severity: 'medium' as SecretSeverity },
        { regex: /aws[_\-]?access[_\-]?key[_\-]?id\s*[:=]\s*['"]([^'"]+)['"]/, type: 'AWS Access Key', severity: 'high' as SecretSeverity },
        { regex: /private[_\-]?key\s*[:=]\s*['"]([^'"]+)['"]/, type: 'Private Key', severity: 'high' as SecretSeverity },
      ];
      
      lines.forEach((line, lineNumber) => {
        for (const pattern of patterns) {
          if (pattern.regex.test(line)) {
            secrets.push({
              id: v4(),
              scanId: v4(),
              filePath: repoUrl,
              lineNumber: lineNumber + 1,
              secretType: pattern.type,
              severity: pattern.severity,
              description: `${pattern.type} found in repository`,
              codeSnippet: line.trim(),
              commit: 'Unknown',
              author: 'Unknown',
              date: new Date().toISOString()
            });
            break; // Only add one finding per line
          }
        }
      });
      
      return secrets;
    }
    
    return [];
  } catch (error) {
    console.error(`Error parsing ${scannerType} output:`, error);
    return [];
  }
};

// Map severity from scanner output to our SecretSeverity type
const mapSeverity = (severity: string | number): SecretSeverity => {
  if (!severity) return 'medium';
  
  if (typeof severity === 'number') {
    if (severity >= 8) return 'high';
    if (severity >= 5) return 'medium';
    if (severity >= 3) return 'low';
    return 'info';
  }
  
  severity = severity.toLowerCase();
  if (severity.includes('critical') || severity.includes('high')) return 'high';
  if (severity.includes('medium')) return 'medium';
  if (severity.includes('low')) return 'low';
  return 'info';
};

// Count the number of secrets by severity
const countSecretsBySeverity = (secrets: Secret[]) => {
  const counts = {
    totalSecrets: secrets.length,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    infoSeverity: 0
  };
  
  secrets.forEach(secret => {
    switch (secret.severity) {
      case 'high':
        counts.highSeverity++;
        break;
      case 'medium':
        counts.mediumSeverity++;
        break;
      case 'low':
        counts.lowSeverity++;
        break;
      case 'info':
        counts.infoSeverity++;
        break;
    }
  });
  
  return counts;
};

// Generate repository ID from URL
const getRepoIdFromUrl = (url: string): string => {
  try {
    return url;
  } catch (error) {
    return url;
  }
};

// Real scanning function
export const scanRepository = async (
  repositoryUrl: string, 
  scannerTypes: ScannerType[]
): Promise<ScanResult> => {
  console.log(`Scanning repository: ${repositoryUrl} with scanners: ${scannerTypes.join(', ')}`);
  
  // Create scan result shell with unique ID
  const scanId = v4();
  const repoId = getRepoIdFromUrl(repositoryUrl);
  const startTime = new Date().toISOString();
  
  let allSecrets: Secret[] = [];
  
  try {
    // Clone repository to a temporary directory (if needed for local scanning)
    // This is optional if your tools can scan directly from URL
    
    // Run each selected scanner
    for (const scannerType of scannerTypes) {
      try {
        let command = '';
        let output = '';
        
        switch (scannerType) {
          case 'trufflehog':
            command = `trufflehog git ${repositoryUrl} --json`;
            break;
          case 'gitleaks':
            command = `gitleaks detect -v -r ${repositoryUrl} --no-git --report-format json`;
            break;
          case 'custom':
            command = `git clone --depth 1 ${repositoryUrl} temp_repo && grep -r "password\\|secret\\|token\\|api.key" temp_repo`;
            break;
          default:
            console.warn(`Unknown scanner type: ${scannerType}`);
            continue;
        }
        
        console.log(`Running command: ${command}`);
        
        try {
          const { stdout } = await execPromise(command);
          output = stdout;
        } catch (error: any) {
          // Some tools exit with non-zero code when they find secrets
          if (error.stdout) {
            output = error.stdout;
          } else {
            console.error(`Error running ${scannerType}:`, error);
            continue;
          }
        }
        
        // Parse output and get secrets
        const secrets = parseSecrets(output, scannerType, repositoryUrl);
        console.log(`Found ${secrets.length} secrets with ${scannerType}`);
        
        // Add scanner type to each secret for reference
        const secretsWithScanner = secrets.map(secret => ({
          ...secret,
          scanId,
          secretType: `${scannerType}: ${secret.secretType}`
        }));
        
        allSecrets = [...allSecrets, ...secretsWithScanner];
      } catch (error) {
        console.error(`Error running ${scannerType}:`, error);
      }
    }
    
    // Clean up temporary files if needed
    // ...
    
  } catch (error) {
    console.error('Error scanning repository:', error);
  }
  
  // Create the final scan result
  const summary = countSecretsBySeverity(allSecrets);
  
  return {
    id: scanId,
    repositoryId: repoId,
    configId: v4(),
    status: 'completed',
    startedAt: startTime,
    completedAt: new Date().toISOString(),
    secrets: allSecrets,
    summary
  };
};

// Get information about repositories that have been scanned
export const getRepositories = async (): Promise<Repository[]> => {
  // This would normally fetch from a database
  // Here we're just returning an empty array since we don't persist data
  return [];
};

// Get all scan results
export const getScanResults = async (repositoryId?: string): Promise<ScanResult[]> => {
  // This would normally fetch from a database
  // Here we're just returning an empty array since we don't persist data
  return [];
};

// Get a specific scan result by ID
export const getScanResult = async (scanId: string): Promise<ScanResult | null> => {
  // This would normally fetch from a database
  // Here we're just returning null since we don't persist data
  return null;
};

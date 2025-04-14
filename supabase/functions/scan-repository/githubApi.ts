
// GitHub API interaction module
import { RepositoryFile, GitHubFileContent, GitHubDirectory } from "./types.ts";

// Fetch repository contents using GitHub API
export async function fetchRepositoryContents(repositoryUrl: string): Promise<RepositoryFile[]> {
  console.log(`Fetching repository contents for: ${repositoryUrl}`);
  
  const repoInfo = extractOwnerAndRepo(repositoryUrl);
  if (!repoInfo) {
    throw new Error(`Could not parse GitHub repository URL: ${repositoryUrl}`);
  }
  
  try {
    const files: RepositoryFile[] = [];
    await fetchDirectoryContents(repoInfo.owner, repoInfo.repo, '', files);
    console.log(`Fetched ${files.length} files from repository`);
    return files;
  } catch (error) {
    console.error('Error fetching repository contents:', error);
    throw error;
  }
}

// Extract owner and repo from GitHub URL (duplicated here to avoid circular imports)
function extractOwnerAndRepo(url: string): { owner: string; repo: string } | null {
  try {
    const regex = /github\.com\/([^\/]+)\/([^\/\.]+)/;
    const match = url.match(regex);
    
    if (match && match.length >= 3) {
      return {
        owner: match[1],
        repo: match[2]
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting owner and repo:', error);
    return null;
  }
}

// Recursive function to fetch directory contents
async function fetchDirectoryContents(
  owner: string,
  repo: string,
  path: string,
  files: RepositoryFile[],
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<void> {
  if (currentDepth > maxDepth) {
    console.log(`Maximum depth reached for path: ${path}`);
    return;
  }
  
  try {
    // GitHub API URL for repo contents
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    console.log(`Fetching: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`GitHub API error: ${response.status} - ${error}`);
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const contents = await response.json();
    
    // Handle both single file and directory responses
    const items = Array.isArray(contents) ? contents : [contents];
    
    for (const item of items) {
      if (item.type === 'dir') {
        // Add directory to files list
        files.push({
          path: item.path,
          content: '',
          type: 'directory',
          size: 0,
          lastModified: new Date().toISOString()
        });
        
        // Recursively fetch contents of this directory
        await fetchDirectoryContents(owner, repo, item.path, files, maxDepth, currentDepth + 1);
      } else if (item.type === 'file') {
        // Only fetch content for text files under a certain size
        if (shouldFetchFileContent(item)) {
          const fileContent = await fetchFileContent(owner, repo, item.path);
          files.push({
            path: item.path,
            content: fileContent,
            type: 'file',
            size: item.size,
            lastModified: new Date().toISOString()
          });
        } else {
          // Skip content fetch for binary or large files
          files.push({
            path: item.path,
            content: 'Binary or large file content not fetched',
            type: 'file',
            size: item.size,
            lastModified: new Date().toISOString()
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching directory contents for ${path}:`, error);
    // Don't throw, continue with other directories
  }
}

// Decide whether to fetch a file's content based on size and extension
function shouldFetchFileContent(file: GitHubFileContent | GitHubDirectory): boolean {
  // Skip files larger than 1MB
  if (file.size > 1024 * 1024) {
    return false;
  }
  
  // Skip common binary files
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', 
    '.zip', '.gz', '.tar', '.mp3', '.mp4', '.mov', '.avi',
    '.exe', '.dll', '.so', '.dylib', '.jar', '.war', '.ear',
    '.class', '.psd', '.ttf', '.woff', '.woff2', '.eot'
  ];
  
  if (binaryExtensions.some(ext => file.path.toLowerCase().endsWith(ext))) {
    return false;
  }
  
  return true;
}

// Fetch content of a specific file
async function fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Error fetching file content for ${path}: ${response.status}`);
      return '';
    }
    
    const data = await response.json();
    
    if (data.encoding === 'base64' && data.content) {
      // Decode Base64 content
      const decoded = atob(data.content.replace(/\n/g, ''));
      return decoded;
    }
    
    return 'File content could not be decoded';
  } catch (error) {
    console.error(`Error fetching content for ${path}:`, error);
    return '';
  }
}

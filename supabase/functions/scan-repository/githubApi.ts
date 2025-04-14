
// GitHub API interaction module
import { RepositoryFile, GitHubFileContent, GitHubDirectory } from "./types.ts";
import { corsHeaders, extractOwnerAndRepo } from "./coreUtils.ts";

// Fetch repository contents using GitHub API
export async function fetchRepositoryContents(repositoryUrl: string): Promise<RepositoryFile[]> {
  console.log(`Fetching repository contents for: ${repositoryUrl}`);
  
  const repoInfo = extractOwnerAndRepo(repositoryUrl);
  if (!repoInfo) {
    throw new Error(`Could not parse GitHub repository URL: ${repositoryUrl}`);
  }
  
  try {
    const files: RepositoryFile[] = [];
    
    // First check if the repository exists and is accessible
    const checkUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`;
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CodeGuardian-Scanner'
    };
    
    // Add GitHub token if available (not required for public repos)
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
      console.log("Using GitHub token for authentication");
    } else {
      console.log("No GitHub token found, accessing as anonymous user");
    }
    
    // Check repository accessibility
    const repoCheckResponse = await fetch(checkUrl, { headers });
    
    if (!repoCheckResponse.ok) {
      if (repoCheckResponse.status === 404) {
        throw new Error(`Repository not found: ${repositoryUrl}. Please check the URL and ensure the repository exists and is accessible.`);
      } else if (repoCheckResponse.status === 403) {
        throw new Error(`Access forbidden to repository: ${repositoryUrl}. This could be due to rate limiting or repository visibility restrictions.`);
      } else {
        const errorText = await repoCheckResponse.text();
        throw new Error(`Failed to access repository: ${repoCheckResponse.status} - ${errorText}`);
      }
    }
    
    // Repository is accessible, proceed with fetching contents
    await fetchDirectoryContents(repoInfo.owner, repoInfo.repo, '', files, 5, 0, headers);
    console.log(`Fetched ${files.length} files from repository`);
    
    if (files.length === 0) {
      console.warn("No files were retrieved from the repository. This could indicate an empty repository or access restrictions.");
    }
    
    return files;
  } catch (error) {
    console.error('Error fetching repository contents:', error);
    throw new Error(`Failed to access repository: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Recursive function to fetch directory contents
async function fetchDirectoryContents(
  owner: string,
  repo: string,
  path: string,
  files: RepositoryFile[],
  maxDepth: number = 5,
  currentDepth: number = 0,
  headers: HeadersInit
): Promise<void> {
  if (currentDepth > maxDepth) {
    console.log(`Maximum depth reached for path: ${path}`);
    return;
  }
  
  try {
    // GitHub API URL for repo contents
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    console.log(`Fetching: ${url}`);
    
    const response = await fetch(url, { headers });
    
    if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
      console.error('GitHub API rate limit exceeded. Consider adding a GitHub token for higher rate limits.');
      throw new Error('GitHub API rate limit exceeded. Try again later or use a GitHub token.');
    }
    
    if (response.status === 404) {
      console.error(`Repository path not found: ${path}`);
      throw new Error(`Repository path not found: ${path}`);
    }
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`GitHub API error ${response.status}: ${error}`);
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
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
        await fetchDirectoryContents(owner, repo, item.path, files, maxDepth, currentDepth + 1, headers);
      } else if (item.type === 'file') {
        // Only fetch content for text files under a certain size
        if (shouldFetchFileContent(item)) {
          try {
            const fileContent = await fetchFileContent(owner, repo, item.path, headers);
            files.push({
              path: item.path,
              content: fileContent,
              type: 'file',
              size: item.size,
              lastModified: new Date().toISOString()
            });
          } catch (fileError) {
            console.warn(`Could not fetch content for ${item.path}: ${fileError instanceof Error ? fileError.message : String(fileError)}`);
            files.push({
              path: item.path,
              content: 'Failed to fetch file content',
              type: 'file',
              size: item.size,
              lastModified: new Date().toISOString()
            });
          }
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
    // Continue with other directories instead of failing completely
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
async function fetchFileContent(owner: string, repo: string, path: string, headers: HeadersInit): Promise<string> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await fetch(url, { headers });
    
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

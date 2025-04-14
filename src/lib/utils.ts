
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SecretSeverity } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a simple UUID for mock data
export function v4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Format date string
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Get severity badge class
export function getSeverityClass(severity: SecretSeverity): string {
  switch (severity) {
    case 'high':
      return 'scanner-badge-high';
    case 'medium':
      return 'scanner-badge-medium';
    case 'low':
      return 'scanner-badge-low';
    case 'info':
      return 'scanner-badge-info';
    default:
      return 'scanner-badge-info';
  }
}

// Parse Git repository URL to get meaningful display name
export function parseRepoName(url: string): string {
  try {
    // Handle various Git URL formats
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length >= 2) {
      // For GitHub/GitLab/Bitbucket style URLs: owner/repo
      return `${pathParts[pathParts.length - 2]}/${pathParts[pathParts.length - 1].replace('.git', '')}`;
    } else if (pathParts.length === 1) {
      // Just the repo name
      return pathParts[0].replace('.git', '');
    }
    
    return url;
  } catch (e) {
    // If URL parsing fails, extract what looks like a repo name
    const parts = url.split('/');
    return parts[parts.length - 1].replace('.git', '') || url;
  }
}

// Generate random scanner progress for simulation
export function getRandomScanProgress(): number {
  return Math.floor(Math.random() * 100);
}

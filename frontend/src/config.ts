// API Configuration
// In development: Uses proxy (vite.config.ts) to forward /api to localhost:3000
// In production: Uses VITE_API_URL environment variable

export const API_URL = import.meta.env.VITE_API_URL || '';

// Helper function to get full API path
export function getApiUrl(path: string): string {
  // In development, use relative /api paths (proxied by Vite)
  if (import.meta.env.DEV) {
    return path.startsWith('/api') ? path : `/api${path}`;
  }

  // In production, use full URL with API_URL
  const cleanPath = path.startsWith('/api') ? path : `/api${path}`;
  return `${API_URL}${cleanPath}`;
}

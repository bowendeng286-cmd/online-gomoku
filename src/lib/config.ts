// Configuration for game client
// All communication now uses HTTP polling
export const GAME_CONFIG = {
  // API base URL for HTTP polling
  getApiUrl(): string {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.host;
      return `${protocol}//${host}`;
    }
    
    // Server-side fallback
    if (typeof process !== 'undefined' && process.env) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (apiUrl) {
        return apiUrl;
      }
    }
    
    // Development fallback
    return 'http://localhost:3000';
  },
  
  // Game API endpoint
  getGameApiUrl(): string {
    return `${this.getApiUrl()}/api/game`;
  },
  
  // Authentication API endpoint
  getAuthApiUrl(): string {
    return `${this.getApiUrl()}/api/auth`;
  }
};

export const GAME_CONFIG = {
  // WebSocket server URL - auto-detect based on environment
  getWebSocketUrl(): string {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${protocol}//${host}`;
    }
    
    // Server-side fallback
    if (typeof process !== 'undefined' && process.env) {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
      if (wsUrl) {
        return wsUrl;
      }
    }
    
    // Development fallback
    return 'ws://localhost:8080';
  },
  
  // Fallback HTTP polling for environments where WebSocket is not available
  getPollingUrl(): string {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.host;
      return `${protocol}//${host}/api/game`;
    }
    
    return 'http://localhost:5000/api/game';
  }
};
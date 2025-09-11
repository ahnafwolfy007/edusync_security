// Session isolation utility for multi-port development
import SESSION_CONFIG from '../config/sessionConfig';

class SessionManager {
  constructor() {
    this.port = this.getCurrentPort();
    this.prefix = SESSION_CONFIG.USE_PORT_ISOLATION ? `edusync_${this.port}_` : '';
    this.debug = SESSION_CONFIG.DEBUG_SESSION;
    
    if (this.debug) {
      console.log('SessionManager initialized:', { 
        port: this.port, 
        prefix: this.prefix,
        portIsolation: SESSION_CONFIG.USE_PORT_ISOLATION 
      });
    }
  }

  getCurrentPort() {
    return window.location.port || '3000';
  }

  // Port-specific localStorage methods
  setItem(key, value) {
    try {
      const storageKey = this.prefix + key;
      localStorage.setItem(storageKey, value);
      if (this.debug) {
        console.log('SessionManager setItem:', { key: storageKey, value });
      }
    } catch (error) {
      console.warn('SessionManager setItem error:', error);
      if (SESSION_CONFIG.FALLBACK_TO_REGULAR_STORAGE) {
        try {
          localStorage.setItem(key, value);
          if (this.debug) {
            console.log('Fallback to regular storage for setItem:', { key, value });
          }
        } catch (fallbackError) {
          console.error('Fallback setItem also failed:', fallbackError);
        }
      }
    }
  }

  getItem(key) {
    try {
      const storageKey = this.prefix + key;
      const value = localStorage.getItem(storageKey);
      if (this.debug) {
        console.log('SessionManager getItem:', { key: storageKey, value });
      }
      return value;
    } catch (error) {
      console.warn('SessionManager getItem error:', error);
      if (SESSION_CONFIG.FALLBACK_TO_REGULAR_STORAGE) {
        try {
          const value = localStorage.getItem(key);
          if (this.debug) {
            console.log('Fallback to regular storage for getItem:', { key, value });
          }
          return value;
        } catch (fallbackError) {
          console.error('Fallback getItem also failed:', fallbackError);
          return null;
        }
      }
      return null;
    }
  }

  removeItem(key) {
    try {
      const storageKey = this.prefix + key;
      localStorage.removeItem(storageKey);
      if (this.debug) {
        console.log('SessionManager removeItem:', { key: storageKey });
      }
    } catch (error) {
      console.warn('SessionManager removeItem error:', error);
      if (SESSION_CONFIG.FALLBACK_TO_REGULAR_STORAGE) {
        try {
          localStorage.removeItem(key);
          if (this.debug) {
            console.log('Fallback to regular storage for removeItem:', { key });
          }
        } catch (fallbackError) {
          console.error('Fallback removeItem also failed:', fallbackError);
        }
      }
    }
  }

  clear() {
    // Only clear items with our port prefix
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Check if there are sessions from other ports
  getActiveSessions() {
    const keys = Object.keys(localStorage);
    const sessions = {};
    
    keys.forEach(key => {
      const match = key.match(/^edusync_(\d+)_userData$/);
      if (match) {
        const port = match[1];
        try {
          const userData = JSON.parse(localStorage.getItem(key));
          sessions[port] = {
            port,
            user: userData,
            active: !!localStorage.getItem(`edusync_${port}_accessToken`)
          };
        } catch (e) {
          // Invalid session data
        }
      }
    });
    
    return sessions;
  }

  // Switch to session from a different port session
  switchToSession(port) {
    if (port !== this.port) {
      const targetUrl = window.location.protocol + '//' + 
                       window.location.hostname + ':' + port + 
                       window.location.pathname;
      window.open(targetUrl, '_blank');
    }
  }

  // Temporarily disable port isolation (for debugging marketplace issues)
  disablePortIsolation() {
    console.warn('Disabling port isolation - this will affect session management');
    this.prefix = '';
    return this;
  }

  // Re-enable port isolation
  enablePortIsolation() {
    console.log('Re-enabling port isolation');
    this.prefix = `edusync_${this.port}_`;
    return this;
  }

  // Check if port isolation is currently enabled
  isPortIsolationEnabled() {
    return this.prefix !== '';
  }

  // Clean up expired sessions
  cleanupExpiredSessions() {
    const sessions = this.getActiveSessions();
    Object.keys(sessions).forEach(port => {
      const token = localStorage.getItem(`edusync_${port}_accessToken`);
      if (!token) {
        // Remove all data for this port
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(`edusync_${port}_`)) {
            localStorage.removeItem(key);
          }
        });
      }
    });
  }
}

export default SessionManager;

// Configuration for session management
const SESSION_CONFIG = {
  // Set to false to disable port-specific session isolation
  USE_PORT_ISOLATION: true,
  
  // Fallback to regular localStorage if port isolation fails
  FALLBACK_TO_REGULAR_STORAGE: true,
  
  // Debug mode for session management
  DEBUG_SESSION: process.env.NODE_ENV === 'development'
};

export default SESSION_CONFIG;

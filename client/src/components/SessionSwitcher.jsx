import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  FiUsers, 
  FiMonitor, 
  FiExternalLink, 
  FiLogOut,
  FiUser,
  FiSettings,
  FiAlertCircle
} from 'react-icons/fi';

const SessionSwitcher = () => {
  const { user, getActiveSessions, switchToSession, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState({});
  const [currentPort, setCurrentPort] = useState(window.location.port || '3000');

  useEffect(() => {
    if (isOpen) {
      const activeSessions = getActiveSessions();
      setSessions(activeSessions);
    }
  }, [isOpen, getActiveSessions]);

  const handleSwitchSession = (port) => {
    switchToSession(port);
  };

  const handleLogoutSession = async (port) => {
    if (port === currentPort) {
      await logout();
    } else {
      // Clear session data for other port
      const sessionManager = new (await import('../utils/SessionManager')).default();
      sessionManager.port = port;
      sessionManager.clear();
      
      // Refresh sessions
      const activeSessions = getActiveSessions();
      setSessions(activeSessions);
    }
  };

  const activeSessionCount = Object.keys(sessions).length;

  if (activeSessionCount <= 1) {
    return null; // Don't show if only one session
  }

  return (
    <div className="relative">
      {/* Session Indicator */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <FiUsers size={16} />
        <span className="text-sm font-medium">{activeSessionCount} Sessions</span>
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      </motion.button>

      {/* Sessions Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-80 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <FiMonitor size={20} />
                  Active Sessions
                </h3>
                <p className="text-sm opacity-90">
                  Multiple accounts running on different ports
                </p>
              </div>

              {/* Sessions List */}
              <div className="max-h-64 overflow-y-auto">
                {Object.values(sessions).map((session) => {
                  const isCurrentSession = session.port === currentPort;
                  
                  return (
                    <motion.div
                      key={session.port}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200 ${
                        isCurrentSession ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isCurrentSession 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            <FiUser size={16} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              {session.user?.name || session.user?.full_name || 'Unknown User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              Port {session.port} • {session.user?.role_name || 'User'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {session.user?.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isCurrentSession ? (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full font-medium">
                              Current
                            </span>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleSwitchSession(session.port)}
                              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              title="Switch to this session"
                            >
                              <FiExternalLink size={14} />
                            </motion.button>
                          )}
                          
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleLogoutSession(session.port)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Logout this session"
                          >
                            <FiLogOut size={14} />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiAlertCircle size={14} />
                  <span>Each session runs independently on different ports</span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Current port: <strong>localhost:{currentPort}</strong>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SessionSwitcher;

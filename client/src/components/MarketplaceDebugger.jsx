import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { FiTool, FiRefreshCw, FiCheck, FiX, FiInfo } from 'react-icons/fi';

const MarketplaceDebugger = () => {
  const { user, sessionManager } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [debugResults, setDebugResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  const debugTests = [
    {
      id: 'session_check',
      name: 'Session Manager Check',
      test: async () => {
        const accessToken = sessionManager?.getItem('accessToken');
        const userData = sessionManager?.getItem('userData');
        return {
          hasSessionManager: !!sessionManager,
          hasAccessToken: !!accessToken,
          hasUserData: !!userData,
          portIsolation: sessionManager?.isPortIsolationEnabled?.() || false,
          currentPort: sessionManager?.port || window.location.port
        };
      }
    },
    {
      id: 'api_base_check',
      name: 'API Base URL Check',
      test: async () => {
        const baseURL = api.defaults.baseURL;
        return {
          baseURL,
          isLocalhost: baseURL.includes('localhost'),
          port: baseURL.match(/:(\d+)/)?.[1] || 'unknown'
        };
      }
    },
    {
      id: 'business_endpoint',
      name: 'Business Marketplace Endpoint',
      test: async () => {
        try {
          const response = await api.get('/business-marketplace/shops?limit=1');
          return {
            status: 'success',
            responseCode: response.status,
            hasData: !!response.data,
            dataStructure: Object.keys(response.data || {})
          };
        } catch (error) {
          return {
            status: 'error',
            error: error.message,
            responseCode: error.response?.status,
            errorData: error.response?.data
          };
        }
      }
    },
    {
      id: 'business_types_endpoint',
      name: 'Business Types Endpoint',
      test: async () => {
        try {
          const response = await api.get('/business-marketplace/types');
          return {
            status: 'success',
            responseCode: response.status,
            hasData: !!response.data,
            dataStructure: Object.keys(response.data || {})
          };
        } catch (error) {
          return {
            status: 'error',
            error: error.message,
            responseCode: error.response?.status,
            errorData: error.response?.data
          };
        }
      }
    },
    {
      id: 'trending_endpoint',
      name: 'Trending Businesses Endpoint',
      test: async () => {
        try {
          const response = await api.get('/business-marketplace/trending?limit=3');
          return {
            status: 'success',
            responseCode: response.status,
            hasData: !!response.data,
            dataStructure: Object.keys(response.data || {})
          };
        } catch (error) {
          return {
            status: 'error',
            error: error.message,
            responseCode: error.response?.status,
            errorData: error.response?.data
          };
        }
      }
    }
  ];

  const runAllTests = async () => {
    setIsRunning(true);
    const results = {};

    for (const test of debugTests) {
      try {
        results[test.id] = await test.test();
      } catch (error) {
        results[test.id] = {
          status: 'error',
          error: error.message
        };
      }
    }

    setDebugResults(results);
    setIsRunning(false);
  };

  const togglePortIsolation = () => {
    if (sessionManager?.isPortIsolationEnabled?.()) {
      sessionManager.disablePortIsolation();
    } else {
      sessionManager?.enablePortIsolation?.();
    }
    // Re-run session check
    debugTests[0].test().then(result => {
      setDebugResults(prev => ({
        ...prev,
        session_check: result
      }));
    });
  };

  const getTestIcon = (result) => {
    if (!result) return <FiInfo className="text-gray-400" />;
    if (result.status === 'success') return <FiCheck className="text-green-500" />;
    if (result.status === 'error') return <FiX className="text-red-500" />;
    return <FiInfo className="text-blue-500" />;
  };

  if (!isOpen) {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-red-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50"
        title="Marketplace Debugger"
      >
        <FiTool size={20} />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-4 right-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-red-500 to-pink-500 text-white">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <FiTool size={18} />
            Marketplace Debugger
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-80 overflow-y-auto">
        <div className="flex gap-2 mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={runAllTests}
            disabled={isRunning}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FiRefreshCw className={isRunning ? 'animate-spin' : ''} size={16} />
            {isRunning ? 'Running...' : 'Run Tests'}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={togglePortIsolation}
            className="bg-orange-500 text-white py-2 px-4 rounded-lg font-medium text-sm"
          >
            Toggle Isolation
          </motion.button>
        </div>

        {/* Test Results */}
        <div className="space-y-3">
          {debugTests.map((test) => {
            const result = debugResults[test.id];
            return (
              <div key={test.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  {getTestIcon(result)}
                  <span className="font-medium text-sm">{test.name}</span>
                </div>
                {result && (
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>

        {/* Current Session Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Current Session</h4>
          <div className="text-xs space-y-1">
            <div>User: {user?.name || 'Not logged in'}</div>
            <div>Port: {window.location.port || '3000'}</div>
            <div>URL: {window.location.href}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MarketplaceDebugger;

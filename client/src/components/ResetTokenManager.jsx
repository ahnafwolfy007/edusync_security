import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Trash2, Clock, Mail, Shield } from 'lucide-react';
import api from '../api';

const ResetTokenManager = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTokens = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/forgot-password/tokens');
      setTokens(response.data.tokens);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch tokens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const formatTime = (date) => {
    return new Date(date).toLocaleString();
  };

  const isExpired = (date) => {
    return new Date() > new Date(date);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Shield className="mr-3 text-indigo-600" size={28} />
                Reset Token Manager
              </h1>
              <p className="text-gray-600 mt-1">Development tool to manage password reset tokens</p>
            </div>
            <button
              onClick={fetchTokens}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              <RefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} size={16} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="grid gap-4">
            {tokens.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600 text-lg">No reset tokens found</p>
                <p className="text-gray-500 text-sm mt-2">
                  Reset tokens will appear here when users request password resets
                </p>
              </div>
            ) : (
              tokens.map((tokenData, index) => (
                <motion.div
                  key={tokenData.token}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 border rounded-lg ${
                    tokenData.isExpired ? 
                    'bg-red-50 border-red-200' : 
                    'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <Mail className="mr-2 text-gray-600" size={16} />
                        <span className="font-medium text-gray-900">{tokenData.email}</span>
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                          tokenData.isExpired ? 
                          'bg-red-100 text-red-800' : 
                          'bg-green-100 text-green-800'
                        }`}>
                          {tokenData.isExpired ? 'Expired' : 'Active'}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="mr-2" size={14} />
                          Expires: {formatTime(tokenData.expiresAt)}
                        </div>
                        
                        <div className="break-all">
                          <span className="text-xs text-gray-500">Token:</span>
                          <div className="mt-1 p-2 bg-gray-100 rounded border font-mono text-sm">
                            {tokenData.token}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => copyToClipboard(tokenData.token)}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                      >
                        Copy Token
                      </button>
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/reset-password/${tokenData.token}`)}
                        className="px-3 py-1 text-xs bg-indigo-100 text-indigo-800 rounded hover:bg-indigo-200"
                      >
                        Copy URL
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {tokens.length > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                <strong>Development Mode:</strong> In production, tokens should be sent via email 
                and not displayed in the UI. This panel is for development testing only.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetTokenManager;

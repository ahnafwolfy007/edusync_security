import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft, FiRefreshCw, FiSend } from 'react-icons/fi';
import api from '../api';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('email'); // email, sent

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/forgot-password/request', { email });
      setMessage(response.data.message);
      setStep('sent');
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setMessage('');
    setError('');
    setStep('email');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-md bg-white rounded-xl shadow-2xl"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {step === 'email' ? 'Forgot Password' : 'Check Your Email'}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FiArrowLeft size={20} />
            </button>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <FiRefreshCw className="animate-spin" size={20} />
                ) : (
                  <>
                    <FiSend size={20} className="mr-2" />
                    Send Reset Code
                  </>
                )}
              </button>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <span className="text-red-800 text-sm">{error}</span>
                </div>
              )}
            </form>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiMail className="text-green-600" size={32} />
              </div>
              <p className="text-gray-600 mb-4">
                We've sent a password reset code to <strong>{email}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Please check your email and use the 6-digit code to reset your password.
              </p>
              <button
                onClick={handleClose}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          )}

          {message && step === 'email' && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-green-800 text-sm">{message}</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordModal;

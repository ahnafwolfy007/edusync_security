import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMail, 
  FiArrowLeft, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiEye, 
  FiEyeOff,
  FiRefreshCw,
  FiShield,
  FiClock,
  FiSend
} from 'react-icons/fi';
import api from '../api';

const ForgotPassword = ({ onBack }) => {
  const [step, setStep] = useState('request'); // request, verify, reset, success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState(''); // For development

  const clearMessages = () => {
    setMessage('');
    setError('');
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const response = await api.post('/forgot-password/request', { email });
      setMessage(response.data.message);
      
      // In development, show the OTP
      if (response.data.otp) {
        setDevOtp(response.data.otp);
        setOtp(response.data.otp);
      }
      
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const response = await api.post('/forgot-password/verify-otp', { email, otp });
      setMessage(response.data.message);
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/forgot-password/reset', {
        email,
        otp,
        newPassword,
        confirmPassword
      });
      setMessage(response.data.message);
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  const containerVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FiArrowLeft size={20} />
            </button>
            <h2 className="text-xl font-bold">Reset Password</h2>
            <div className="w-8" />
          </div>
          
          {/* Progress indicator */}
          <div className="mt-6 flex items-center justify-center space-x-2">
            {['request', 'verify', 'reset', 'success'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step === stepName || 
                    ['request', 'verify', 'reset', 'success'].indexOf(step) > index
                      ? 'bg-white text-indigo-600'
                      : 'bg-white/30 text-white'
                  }`}
                >
                  {index + 1}
                </div>
                {index < 3 && (
                  <div
                    className={`w-8 h-0.5 mx-1 transition-colors ${
                      ['request', 'verify', 'reset', 'success'].indexOf(step) > index
                        ? 'bg-white'
                        : 'bg-white/30'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Request Reset */}
            {step === 'request' && (
              <motion.div
                key="request"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                    <FiMail className="text-indigo-600" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Forgot Your Password?
                  </h3>
                  <p className="text-gray-600">
                    Enter your email address and we'll send you a reset code.
                  </p>
                </div>

                <form onSubmit={handleRequestReset} className="space-y-4">
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

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <FiRefreshCw className="animate-spin" size={20} />
                    ) : (
                      <>
                        <FiSend size={20} className="mr-2" />
                        Send Reset Token
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}

            {/* Step 2: Verify Token */}
            {step === 'verify' && (
              <motion.div
                key="verify"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                    <FiShield className="text-yellow-600" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Verify Your Code
                  </h3>
                  <p className="text-gray-600">
                    Enter the 6-digit code sent to your email.
                  </p>
                  <div className="mt-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center text-yellow-800 text-sm">
                      <FiClock size={16} className="mr-2" />
                      Code expires in 10 minutes
                    </div>
                  </div>
                </div>

                {/* Development OTP display */}
                {devOtp && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800 font-medium">Development Mode:</p>
                    <p className="text-lg text-green-700 font-mono font-bold tracking-wider">{devOtp}</p>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-lg text-center tracking-wider"
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      required
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <FiRefreshCw className="animate-spin" size={20} />
                    ) : (
                      <>
                        <FiShield size={20} className="mr-2" />
                        Verify Code
                      </>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => setStep('request')}
                    className="w-full text-indigo-600 hover:text-indigo-700 py-2 text-sm font-medium"
                  >
                    Back to Email Entry
                  </button>
                </form>
              </motion.div>
            )}

            {/* Step 3: Reset Password */}
            {step === 'reset' && (
              <motion.div
                key="reset"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <FiShield className="text-green-600" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Create New Password
                  </h3>
                  <p className="text-gray-600">
                    Enter your new password below.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter new password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Confirm new password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Password strength indicator */}
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600">Password strength:</div>
                    <div className="space-y-1">
                      <div className={`flex items-center text-xs ${
                        newPassword.length >= 6 ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <FiCheckCircle size={12} className="mr-1" />
                        At least 6 characters
                      </div>
                      <div className={`flex items-center text-xs ${
                        newPassword === confirmPassword && confirmPassword !== '' 
                          ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        <FiCheckCircle size={12} className="mr-1" />
                        Passwords match
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <FiRefreshCw className="animate-spin" size={20} />
                    ) : (
                      <>
                        <FiShield size={20} className="mr-2" />
                        Reset Password
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
              <motion.div
                key="success"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <FiCheckCircle className="text-green-600" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Password Reset Successfully!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Your password has been reset. You can now login with your new password.
                  </p>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onBack}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Back to Login
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center"
              >
                <FiCheckCircle className="text-green-600 mr-2" size={16} />
                <span className="text-green-800 text-sm">{message}</span>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center"
              >
                <FiAlertCircle className="text-red-600 mr-2" size={16} />
                <span className="text-red-800 text-sm">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;

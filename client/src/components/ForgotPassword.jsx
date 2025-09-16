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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden relative z-10"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <FiArrowLeft size={20} />
            </motion.button>
            <h2 className="text-xl font-bold">🔒 Reset Password</h2>
            <div className="w-8" />
          </div>
          
          {/* Progress indicator */}
          <div className="mt-6 flex items-center justify-center space-x-2">
            {['request', 'verify', 'reset', 'success'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: step === stepName || 
                    ['request', 'verify', 'reset', 'success'].indexOf(step) > index ? 1 : 0.8 }}
                  transition={{ duration: 0.3 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    step === stepName || 
                    ['request', 'verify', 'reset', 'success'].indexOf(step) > index
                      ? 'bg-white text-cyan-600 shadow-lg'
                      : 'bg-white/30 text-white border border-white/50'
                  }`}
                >
                  {index === 3 && step === 'success' ? '✅' : index + 1}
                </motion.div>
                {index < 3 && (
                  <div
                    className={`w-8 h-0.5 mx-1 transition-all duration-300 ${
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
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mb-4">
                    <FiMail className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Forgot Your Password? 🤔
                  </h3>
                  <p className="text-purple-200">
                    Enter your email address and we'll send you a reset code.
                  </p>
                </div>

                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      📧 Email Address
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300" size={20} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-purple-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
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
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-cyan-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <FiRefreshCw className="animate-spin" size={20} />
                    ) : (
                      <>
                        <FiSend size={20} className="mr-2" />
                        Send Reset Token 🚀
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
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4">
                    <FiShield className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Verify Your Code 🔐
                  </h3>
                  <p className="text-purple-200">
                    Enter the 6-digit code sent to your email.
                  </p>
                  <div className="mt-2 p-3 bg-yellow-500/20 backdrop-blur-sm rounded-lg border border-yellow-400/30">
                    <div className="flex items-center text-yellow-200 text-sm">
                      <FiClock size={16} className="mr-2" />
                      Code expires in 10 minutes ⏰
                    </div>
                  </div>
                </div>

                {/* Development OTP display */}
                {devOtp && (
                  <div className="mb-4 p-3 bg-green-500/20 backdrop-blur-sm rounded-lg border border-green-400/30">
                    <p className="text-sm text-green-200 font-medium">Development Mode:</p>
                    <p className="text-lg text-green-100 font-mono font-bold tracking-wider">{devOtp}</p>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      🔢 Verification Code
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-purple-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono text-lg text-center tracking-wider transition-all duration-300"
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
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-cyan-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <FiRefreshCw className="animate-spin" size={20} />
                    ) : (
                      <>
                        <FiShield size={20} className="mr-2" />
                        Verify Code ✅
                      </>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => setStep('request')}
                    className="w-full text-cyan-300 hover:text-cyan-200 py-2 text-sm font-medium transition-colors"
                  >
                    ← Back to Email Entry
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
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-4">
                    <FiShield className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Create New Password 🆕
                  </h3>
                  <p className="text-purple-200">
                    Enter your new password below.
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      🔒 New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-purple-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
                        placeholder="Enter new password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                      >
                        {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      🔒 Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-purple-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-300"
                        placeholder="Confirm new password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Password strength indicator */}
                  <div className="space-y-2">
                    <div className="text-xs text-purple-200">Password strength:</div>
                    <div className="space-y-1">
                      <div className={`flex items-center text-xs ${
                        newPassword.length >= 6 ? 'text-green-300' : 'text-purple-300'
                      }`}>
                        <FiCheckCircle size={12} className="mr-1" />
                        At least 6 characters
                      </div>
                      <div className={`flex items-center text-xs ${
                        newPassword === confirmPassword && confirmPassword !== '' 
                          ? 'text-green-300' : 'text-purple-300'
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
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <FiRefreshCw className="animate-spin" size={20} />
                    ) : (
                      <>
                        <FiShield size={20} className="mr-2" />
                        Reset Password 🎉
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
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-4">
                    <FiCheckCircle className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    🎉 Password Reset Successfully!
                  </h3>
                  <p className="text-purple-200 mb-6">
                    Your password has been reset. You can now login with your new password.
                  </p>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onBack}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Back to Login 🚀
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
                className="mt-4 p-3 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-lg flex items-center"
              >
                <FiCheckCircle className="text-green-300 mr-2" size={16} />
                <span className="text-green-100 text-sm">{message}</span>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-3 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-lg flex items-center"
              >
                <FiAlertCircle className="text-red-300 mr-2" size={16} />
                <span className="text-red-100 text-sm">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;

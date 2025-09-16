import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiShield, 
  FiCheckCircle, 
  FiAlertCircle,
  FiArrowLeft,
  FiClock,
  FiSend,
  FiRefreshCw
} from 'react-icons/fi';
import { useNotification } from '../context/NotificationContext';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [step, setStep] = useState('request'); // request, verify, reset, success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Password strength calculation
  const passwordScore = (pw) => {
    let score = 0;
    if (!pw) return 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = passwordScore(newPassword);
  const strengthMeta = [
    { label: 'Too Weak', color: 'bg-red-500', bar: 0 },
    { label: 'Weak', color: 'bg-orange-500', bar: 25 },
    { label: 'Fair', color: 'bg-yellow-500', bar: 50 },
    { label: 'Good', color: 'bg-blue-500', bar: 75 },
    { label: 'Strong', color: 'bg-green-500', bar: 100 }
  ][strength];

  // Timer effect for resend
  React.useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email) {
      showError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      if (data.success) {
        showSuccess('Reset code sent to your email!');
        setStep('verify');
        setResendTimer(60);
      } else {
        showError(data.message || 'Failed to send reset code');
      }
    } catch (error) {
      console.error('Request reset error:', error);
      showError('Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      showError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/forgot-password/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      
      const data = await response.json();
      if (data.success) {
        showSuccess('Code verified successfully!');
        setStep('reset');
      } else {
        showError(data.message || 'Invalid or expired code');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      showError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      showError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword, confirmPassword })
      });
      
      const data = await response.json();
      if (data.success) {
        showSuccess('Password reset successfully!');
        setStep('success');
      } else {
        showError(data.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      showError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((stepNum) => (
        <React.Fragment key={stepNum}>
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: getCurrentStepNumber() >= stepNum ? 1 : 0.8 }}
            transition={{ duration: 0.3 }}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              getCurrentStepNumber() >= stepNum
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg'
                : 'bg-white/20 text-white/60 backdrop-blur-sm'
            }`}
          >
            {stepNum === 4 && step === 'success' ? (
              <FiCheckCircle className="w-5 h-5" />
            ) : (
              stepNum
            )}
          </motion.div>
          {stepNum < 4 && (
            <div className={`w-16 h-1 mx-2 rounded transition-all duration-300 ${
              getCurrentStepNumber() > stepNum ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : 'bg-white/20'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const getCurrentStepNumber = () => {
    switch (step) {
      case 'request': return 1;
      case 'verify': return 2;
      case 'reset': return 3;
      case 'success': return 4;
      default: return 1;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="sm:mx-auto sm:w-full sm:max-w-md"
        >
          <div className="text-center">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="inline-block"
            >
              <h1 className="text-5xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                EduSync
              </h1>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-2"
            >
              🔒 Reset Your Password
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-purple-200"
            >
              Secure your account with a new password ✨
            </motion.p>
          </div>
        </motion.div>

        {/* Reset Form */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
        >
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
            {renderStepIndicator()}

            {/* Step 1: Request Reset */}
            {step === 'request' && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FiMail className="text-white text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Enter Your Email</h3>
                  <p className="text-purple-200 text-sm">We'll send you a reset code</p>
                </div>

                <form onSubmit={handleRequestReset} className="space-y-6">
                  <motion.div whileHover={{ scale: 1.02 }} className="group">
                    <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                      📧 Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiMail className="h-5 w-5 text-purple-300 group-hover:text-cyan-300 transition-colors" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                  </motion.div>

                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="mr-3"
                          >
                            <FiRefreshCw />
                          </motion.div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <FiSend className="mr-2" />
                          Send Reset Code 🚀
                        </>
                      )}
                    </span>
                  </motion.button>
                </form>
              </motion.div>
            )}

            {/* Step 2: Verify Code */}
            {step === 'verify' && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FiShield className="text-white text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Verify Your Code</h3>
                  <p className="text-purple-200 text-sm">Enter the 6-digit code sent to your email</p>
                  <div className="mt-3 p-3 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                    <div className="flex items-center justify-center text-yellow-200 text-sm">
                      <FiClock className="mr-2" />
                      Code expires in 10 minutes
                    </div>
                  </div>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <motion.div whileHover={{ scale: 1.02 }} className="group">
                    <label className="block text-sm font-semibold text-white mb-2">
                      🔢 Verification Code
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm font-mono text-lg text-center tracking-wider"
                      placeholder="000000"
                      maxLength={6}
                      required
                    />
                  </motion.div>

                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setStep('request')}
                      className="flex-1 bg-white/10 text-white font-semibold py-3 px-4 rounded-xl hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
                    >
                      ← Back
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="flex-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <FiRefreshCw className="animate-spin mx-auto" />
                      ) : (
                        <>Verify Code ✅</>
                      )}
                    </motion.button>
                  </div>

                  {resendTimer > 0 ? (
                    <p className="text-center text-purple-200 text-sm">
                      🕒 Resend code in {resendTimer}s
                    </p>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      type="button"
                      onClick={() => {
                        setStep('request');
                        setOtp('');
                      }}
                      className="w-full text-cyan-300 hover:text-cyan-200 py-2 text-sm font-medium"
                    >
                      🔄 Resend Code
                    </motion.button>
                  )}
                </form>
              </motion.div>
            )}

            {/* Step 3: Reset Password */}
            {step === 'reset' && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FiLock className="text-white text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Create New Password</h3>
                  <p className="text-purple-200 text-sm">Choose a strong password for your account</p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-6">
                  <motion.div whileHover={{ scale: 1.02 }} className="group">
                    <label className="block text-sm font-semibold text-white mb-2">
                      🔒 New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-purple-300 group-hover:text-cyan-300 transition-colors" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                        placeholder="Enter new password"
                        required
                        minLength={6}
                      />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <FiEyeOff className="h-5 w-5 text-purple-300 hover:text-cyan-300 transition-colors" />
                        ) : (
                          <FiEye className="h-5 w-5 text-purple-300 hover:text-cyan-300 transition-colors" />
                        )}
                      </motion.button>
                    </div>
                    {newPassword && (
                      <div className="mt-2">
                        <div className="w-full h-2 bg-white/20 rounded overflow-hidden">
                          <div
                            className={`h-2 transition-all duration-300 ${strengthMeta.color}`}
                            style={{ width: `${strengthMeta.bar}%` }}
                          />
                        </div>
                        <p className="text-xs mt-1 font-medium text-purple-200 flex items-center">
                          Strength: <span className="ml-1 text-white font-semibold">{strengthMeta.label}</span>
                        </p>
                      </div>
                    )}
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} className="group">
                    <label className="block text-sm font-semibold text-white mb-2">
                      🔒 Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-purple-300 group-hover:text-cyan-300 transition-colors" />
                      </div>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                        placeholder="Confirm new password"
                        required
                        minLength={6}
                      />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <FiEyeOff className="h-5 w-5 text-purple-300 hover:text-cyan-300 transition-colors" />
                        ) : (
                          <FiEye className="h-5 w-5 text-purple-300 hover:text-cyan-300 transition-colors" />
                        )}
                      </motion.button>
                    </div>
                    {confirmPassword && (
                      <div className="mt-2 flex items-center">
                        {newPassword === confirmPassword ? (
                          <div className="flex items-center text-green-300 text-sm">
                            <FiCheckCircle className="mr-2" />
                            Passwords match ✅
                          </div>
                        ) : (
                          <div className="flex items-center text-red-300 text-sm">
                            <FiAlertCircle className="mr-2" />
                            Passwords don't match ❌
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>

                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setStep('verify')}
                      className="flex-1 bg-white/10 text-white font-semibold py-3 px-4 rounded-xl hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
                    >
                      ← Back
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
                      className="flex-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-green-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <FiRefreshCw className="animate-spin mx-auto" />
                      ) : (
                        <>Reset Password 🎉</>
                      )}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FiCheckCircle className="text-white text-3xl" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  🎉 Password Reset Successful!
                </h3>
                <p className="text-purple-200 mb-8">
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>
                
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/login')}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-green-500/25 transition-all duration-300"
                >
                  <FiArrowLeft className="mr-2 inline" />
                  Back to Login 🚀
                </motion.button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Back to Login Link */}
        {step === 'request' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center"
          >
            <Link
              to="/login"
              className="text-cyan-300 hover:text-cyan-200 transition-colors duration-300 flex items-center justify-center"
            >
              <FiArrowLeft className="mr-2" />
              Back to Login
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;

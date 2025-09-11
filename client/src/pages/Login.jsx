import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiShield, FiStar, FiZap, FiTrendingUp } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      showError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await login(formData.email, formData.password, formData.rememberMe);
      if (result?.success) {
        showSuccess('Welcome back!');
        navigate(from, { replace: true });
      } else {
        showError(result?.message || 'Invalid email or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      showError(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-30"
            animate={{
              y: [-20, -100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${100 + Math.random() * 100}%`,
            }}
          />
        ))}
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
              <h1 className="text-6xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                EduSync
              </h1>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-2"
            >
              Welcome Back! 🎓
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-purple-200 text-lg"
            >
              Sign in to your campus universe ✨ or{' '}
              <Link
                to="/register"
                className="font-bold text-cyan-300 hover:text-cyan-200 transition-colors duration-300 underline decoration-wavy"
              >
                join the revolution
              </Link>
            </motion.p>
          </div>
        </motion.div>

        {/* Login Form */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
        >
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="group"
              >
                <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                  📧 Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiMail className="h-5 w-5 text-purple-300 group-hover:text-cyan-300 transition-colors" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    placeholder="Enter your campus email"
                  />
                </div>
              </motion.div>

              {/* Password Field */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="group"
              >
                <label htmlFor="password" className="block text-sm font-semibold text-white mb-2">
                  🔒 Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-purple-300 group-hover:text-cyan-300 transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    placeholder="Enter your password"
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
              </motion.div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center"
                >
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="h-4 w-4 text-cyan-400 focus:ring-cyan-400 border-purple-300 rounded bg-white/10"
                  />
                  <label htmlFor="rememberMe" className="ml-3 block text-sm text-purple-200">
                    Remember me 💭
                  </label>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                >
                  <Link
                    to="/forgot-password"
                    className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 transition-colors duration-300"
                  >
                    Forgot password? 🤔
                  </Link>
                </motion.div>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 flex items-center justify-center">
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-3"
                      >
                        🌟
                      </motion.div>
                      Signing you in...
                    </>
                  ) : (
                    <>
                      <FiZap className="mr-2" />
                      Launch into EduSync! 🚀
                    </>
                  )}
                </span>
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 max-w-6xl mx-auto px-4"
        >
          <div className="text-center mb-12">
            <motion.h3 
              whileHover={{ scale: 1.05 }}
              className="text-4xl font-black text-white mb-4"
            >
              Why Choose EduSync? 🌟
            </motion.h3>
            <p className="text-xl text-purple-200">
              Your all-in-one campus universe awaits! ✨
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              whileHover={{ 
                scale: 1.05, 
                rotateY: 5,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
              }}
              className="group bg-gradient-to-br from-cyan-500/20 to-purple-600/20 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20 hover:border-cyan-400/50 transition-all duration-300"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-12 transition-transform duration-300">
                <span className="text-4xl">🛍️</span>
              </div>
              <h4 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">
                Campus Marketplace 🏪
              </h4>
              <p className="text-purple-200 group-hover:text-white transition-colors">
                Buy, sell, and trade within your campus community with lightning-fast transactions!
              </p>
            </motion.div>
            
            <motion.div
              whileHover={{ 
                scale: 1.05, 
                rotateY: 5,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
              }}
              className="group bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20 hover:border-purple-400/50 transition-all duration-300"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-12 transition-transform duration-300">
                <span className="text-4xl">💳</span>
              </div>
              <h4 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
                Digital Wallet 💰
              </h4>
              <p className="text-purple-200 group-hover:text-white transition-colors">
                Secure payments, instant transfers, and complete financial freedom on campus!
              </p>
            </motion.div>
            
            <motion.div
              whileHover={{ 
                scale: 1.05, 
                rotateY: 5,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
              }}
              className="group bg-gradient-to-br from-pink-500/20 to-yellow-600/20 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20 hover:border-pink-400/50 transition-all duration-300"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-12 transition-transform duration-300">
                <span className="text-4xl">🎓</span>
              </div>
              <h4 className="text-xl font-bold text-white mb-3 group-hover:text-pink-300 transition-colors">
                Student Services 📚
              </h4>
              <p className="text-purple-200 group-hover:text-white transition-colors">
                Tutoring, jobs, housing, and everything you need for campus success!
              </p>
            </motion.div>
          </div>

          {/* Call-to-action */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-12"
          >
            <p className="text-lg text-purple-200 mb-4">
              Join thousands of students already living their best campus life! 🎉
            </p>
            <div className="flex items-center justify-center space-x-8 text-cyan-300">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="flex items-center"
              >
                <FiStar className="mr-2" />
                <span className="font-semibold">10k+ Students</span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                className="flex items-center"
              >
                <FiShield className="mr-2" />
                <span className="font-semibold">100% Secure</span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="flex items-center"
              >
                <FiTrendingUp className="mr-2" />
                <span className="font-semibold">24/7 Support</span>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
};

export default Login;

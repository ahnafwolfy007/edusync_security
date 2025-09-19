import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaGoogle, FaMicrosoft } from 'react-icons/fa';
import { FiMail, FiLock, FiUser, FiPhone, FiMapPin, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

// Unified Auth page: old design (toggle in one card) + current functionality (OTP registration)
export default function AuthToggle() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const { showError, showSuccess } = useNotification();

  const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const allowedDomain = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || '@bscse.uiu.ac.bd');

  // Tabs
  const [isLogin, setIsLogin] = useState(true);
  useEffect(() => {
    const path = (location.pathname || '').toLowerCase();
    if (path.includes('register')) setIsLogin(false);
    if (path.includes('login')) setIsLogin(true);
  }, [location.pathname]);

  // Back nav
  const handleGoBack = () => {
    if (window.history.length > 1) navigate(-1); else navigate('/');
  };

  // Login state
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loadingLogin, setLoadingLogin] = useState(false);

  // Register state (multi-step with OTP)
  const [step, setStep] = useState(1); // 1: basic, 2: otp+role+location, 3: password
  const [reg, setReg] = useState({ name: '', email: '', phone: '', location: '', role: 'student', password: '', confirmPassword: '' });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Helpers
  const setField = (setFn) => (e) => setFn(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const emailIsValid = (e) => /.+@.+\..+/.test(e) && e.toLowerCase().endsWith(allowedDomain);

  // Login submit
  const submitLogin = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) { showError('Email and password required'); return; }
    setLoadingLogin(true);
    try {
      const result = await login(loginData.email, loginData.password, false);
      if (result?.success !== false) {
        showSuccess('Welcome back!');
        navigate('/dashboard');
      } else {
        showError(result?.message || 'Invalid email or password');
      }
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Login failed');
    } finally { setLoadingLogin(false); }
  };

  // Registration validations per step
  const validateStep1 = () => {
    const es = {};
    if (!reg.name.trim()) es.name = 'Full name required';
    if (!reg.email.trim()) es.email = 'Email required';
    else if (!emailIsValid(reg.email)) es.email = `Must end with ${allowedDomain}`;
    if (!reg.phone.trim()) es.phone = 'Phone required';
    setErrors(es); return Object.keys(es).length === 0;
  };
  const validateStep2 = () => {
    const es = {};
    if (!reg.location.trim()) es.location = 'Location required';
    if (!reg.role) es.role = 'Role required';
    setErrors(es); return Object.keys(es).length === 0;
  };
  const validateStep3 = () => {
    const es = {};
    if (!reg.password || reg.password.length < 8) es.password = 'Min 8 characters';
    if (reg.password !== reg.confirmPassword) es.confirmPassword = 'Passwords do not match';
    if (!otpVerified) es.otp = 'Please verify your email with OTP first';
    setErrors(es); return Object.keys(es).length === 0;
  };

  // OTP actions
  const sendOtp = async () => {
    if (!validateStep1()) return;
    try {
      setSendingOtp(true);
      const res = await fetch(`${API_ROOT}/auth/request-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: reg.email, role: reg.role })
      });
      const data = await res.json();
      if (data.success) { setOtpSent(true); setResendTimer(45); }
      else showError(data.message || 'Failed to send OTP');
    } catch {
      showError('Failed to send OTP');
    } finally { setSendingOtp(false); }
  };
  const verifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length !== 6) { setErrors({ otp: 'Enter 6-digit code' }); return; }
    try {
      setVerifyingOtp(true);
      const res = await fetch(`${API_ROOT}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: reg.email, otp: code, role: reg.role })
      });
      const data = await res.json();
      if (data.success) { setOtpVerified(true); }
      else showError(data.message || 'Invalid OTP');
    } catch {
      showError('OTP verification failed');
    } finally { setVerifyingOtp(false); }
  };

  const handleOtpChange = (idx, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otpDigits]; next[idx] = v; setOtpDigits(next);
    if (v && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  // Registration submit
  const submitRegister = async (e) => {
    e.preventDefault();
    if (step === 1) { if (validateStep1()) setStep(2); return; }
    if (step === 2) { if (validateStep2()) setStep(3); return; }
    if (!validateStep3()) return;
    setLoadingRegister(true);
    try {
      const otpCode = otpDigits.join('');
      const payload = { name: reg.name, email: reg.email, phone: reg.phone, location: reg.location, role: reg.role, password: reg.password, otpCode };
      await register(payload);
      showSuccess('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Registration failed');
    } finally { setLoadingRegister(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Back Button */}
      <button onClick={handleGoBack} className="absolute top-4 left-4 z-10 group flex items-center px-4 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white hover:border-indigo-300 hover:scale-105 active:scale-95">
        <FaArrowLeft className="mr-2 text-gray-600 group-hover:text-indigo-600 transition-colors duration-300 group-hover:-translate-x-1 transform" />
        <span className="hidden sm:inline text-gray-700 group-hover:text-indigo-700 font-medium transition-colors duration-300">Back</span>
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
      </button>

      {/* Left Side - Image and Text (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-purple-600 p-6 md:p-12 flex-col justify-center text-white">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Welcome to EduSync</h1>
            <p className="text-lg opacity-90">Your complete campus ecosystem for students and businesses</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 flex items-center justify-center">
            <div className="w-full aspect-square max-w-[384px] bg-white/20 rounded-xl overflow-hidden">
              <img src="/login.png" alt="EduSync Illustration" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Toggle Buttons */}
          <div className="flex border-b">
            <button className={`flex-1 py-4 font-medium ${isLogin ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => { setIsLogin(true); }}>
              Login
            </button>
            <button className={`flex-1 py-4 font-medium ${!isLogin ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => { setIsLogin(false); }}>
              Sign Up
            </button>
          </div>

          {/* Forms */}
          <div className="p-6 md:p-8">
            {isLogin ? (
              <form onSubmit={submitLogin} className="space-y-5">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input name="email" type="email" value={loginData.email} onChange={(e)=>setLoginData({...loginData, email: e.target.value})} required className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="you@domain.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input name="password" type="password" value={loginData.password} onChange={(e)=>setLoginData({...loginData, password: e.target.value})} required className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" />
                  </div>
                </div>
                <button type="submit" disabled={loadingLogin} className={`w-full py-2 px-4 rounded-lg text-white ${loadingLogin ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {loadingLogin ? 'Signing in...' : 'Login'}
                </button>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
                  <div className="relative flex justify-center"><span className="px-2 bg-white text-gray-500 text-sm">Or continue with</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"><FaGoogle className="h-5 w-5 text-red-500" /><span className="ml-2">Google</span></button>
                  <button type="button" className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"><FaMicrosoft className="h-5 w-5 text-blue-500" /><span className="ml-2">Microsoft</span></button>
                </div>
              </form>
            ) : (
              <form onSubmit={submitRegister} className="space-y-5">
                {step === 1 && (
                  <>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Full Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiUser className="h-5 w-5 text-gray-400" /></div>
                        <input name="name" type="text" value={reg.name} onChange={setField(setReg)} required className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="John Doe" />
                      </div>
                      {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiMail className="h-5 w-5 text-gray-400" /></div>
                        <input name="email" type="email" value={reg.email} onChange={setField(setReg)} required className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder={`you${allowedDomain}`} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Must be institutional: {allowedDomain}</p>
                      {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Phone Number</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiPhone className="h-5 w-5 text-gray-400" /></div>
                        <input name="phone" type="tel" value={reg.phone} onChange={setField(setReg)} required className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="+1234567890" />
                      </div>
                      {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={()=>setIsLogin(true)} className="flex-1 py-2 px-4 rounded-lg bg-gray-100 text-gray-700">Back</button>
                      <button type="button" onClick={()=>{ if (validateStep1()) setStep(2); }} className="flex-1 py-2 px-4 rounded-lg bg-indigo-600 text-white">Next</button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Email OTP Verification {otpVerified && <span className="ml-2 text-green-600 text-xs font-semibold inline-flex items-center"><FiShield className="w-4 h-4 mr-1"/>Verified</span>}</label>
                      <div className="flex gap-2">
                        <input disabled value={reg.email} className="flex-1 px-3 py-2 border rounded-lg bg-gray-100" />
                        <button type="button" onClick={sendOtp} disabled={sendingOtp || resendTimer>0 || otpVerified} className={`px-4 py-2 rounded-lg border ${sendingOtp||resendTimer>0||otpVerified ? 'bg-gray-100 text-gray-500' : 'bg-white hover:bg-gray-50'}`}>
                          {otpVerified ? 'Verified' : sendingOtp ? 'Sending...' : resendTimer>0 ? `Resend (${resendTimer}s)` : (otpSent ? 'Resend OTP' : 'Send OTP')}
                        </button>
                      </div>
                      {otpSent && !otpVerified && (
                        <div className="mt-3 flex items-center">
                          {[0,1,2,3,4,5].map(i => (
                            <input key={i} ref={el => otpRefs.current[i] = el} maxLength={1} inputMode="numeric" value={otpDigits[i]} onChange={(e)=>handleOtpChange(i, e.target.value.replace(/[^0-9]/g,''))} className="w-10 h-12 text-center border rounded mx-1" />
                          ))}
                          <button type="button" onClick={verifyOtp} disabled={verifyingOtp || otpDigits.some(d=>!d)} className="ml-3 px-4 py-2 rounded-lg bg-indigo-600 text-white">{verifyingOtp ? 'Verifying...' : 'Verify'}</button>
                        </div>
                      )}
                      {errors.otp && <p className="text-xs text-red-600 mt-1">{errors.otp}</p>}
                      <p className="text-xs text-gray-500 mt-2">Enter the 6-digit code sent to your email.</p>
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Location</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiMapPin className="h-5 w-5 text-gray-400" /></div>
                        <input name="location" type="text" value={reg.location} onChange={setField(setReg)} required className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="City, Country" />
                      </div>
                      {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
                    </div>

                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">I am a...</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['student','business_owner','food_vendor','moderator','admin'].map(r => (
                          <label key={r} className={`px-3 py-2 rounded-lg border cursor-pointer ${reg.role===r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                            <input type="radio" name="role" value={r} checked={reg.role===r} onChange={setField(setReg)} className="hidden" />
                            <span className="capitalize">{r.replace('_',' ')}</span>
                          </label>
                        ))}
                      </div>
                      {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
                    </div>

                    <div className="flex gap-3">
                      <button type="button" onClick={()=>setStep(1)} className="flex-1 py-2 px-4 rounded-lg bg-gray-100 text-gray-700">Previous</button>
                      <button type="button" onClick={()=>{ if (validateStep2()) setStep(3); }} className="flex-1 py-2 px-4 rounded-lg bg-indigo-600 text-white">Next</button>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiLock className="h-5 w-5 text-gray-400" /></div>
                        <input name="password" type="password" value={reg.password} onChange={setField(setReg)} required className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Create a password (min 8 chars)" />
                      </div>
                      {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-2">Confirm Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiLock className="h-5 w-5 text-gray-400" /></div>
                        <input name="confirmPassword" type="password" value={reg.confirmPassword} onChange={setField(setReg)} required className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Confirm your password" />
                      </div>
                      {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>}
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={()=>setStep(2)} className="flex-1 py-2 px-4 rounded-lg bg-gray-100 text-gray-700">Previous</button>
                      <button type="submit" disabled={loadingRegister} className={`flex-1 py-2 px-4 rounded-lg text-white ${loadingRegister ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{loadingRegister ? 'Creating...' : 'Create Account'}</button>
                    </div>
                    {errors.otp && <p className="text-xs text-red-600 mt-2">{errors.otp}</p>}
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

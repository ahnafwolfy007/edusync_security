import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone, FiMapPin, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputsRef = useRef([]);
  const [resendTimer, setResendTimer] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [errors, setErrors] = useState({});
  const allowedDomain = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN || '@bscse.uiu.ac.bd');

  // Countdown for resend OTP
  useEffect(()=>{
    if (resendTimer <= 0) return;
    const t = setTimeout(()=> setResendTimer(resendTimer - 1), 1000);
    return ()=> clearTimeout(t);
  }, [resendTimer]);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    email: '',
    phone: '',
    // Step 2: Location & Role
  location: '',
  role: 'student',
    // Step 3: Password
    password: '',
    confirmPassword: '',
    // Terms
    agreeToTerms: false,
    agreeToPrivacy: false
  });

  

  const roles = [
    { id: 'student', name: 'Student', description: 'I am a university student' },
    { id: 'business_owner', name: 'Business Owner', description: 'I want to sell products/services' },
    { id: 'food_vendor', name: 'Food Vendor', description: 'I want to sell food items' },
    { id: 'moderator', name: 'Moderator', description: 'I help manage platform content' },
    { id: 'admin', name: 'Admin', description: 'Platform administrator (requires special OTP)' }
  ];

  // Password strength logic (score 0-4) -> label & color
  function passwordScore(pw) {
    let score = 0;
    if (!pw) return 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }
  const strength = passwordScore(formData.password);
  const strengthMeta = [
    { label: 'Too Weak', color: 'bg-red-500', bar: 0 },
    { label: 'Weak', color: 'bg-orange-500', bar: 25 },
    { label: 'Fair', color: 'bg-yellow-500', bar: 50 },
    { label: 'Good', color: 'bg-blue-500', bar: 75 },
    { label: 'Strong', color: 'bg-green-600', bar: 100 }
  ][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (currentStep < 3) {
      handleNextStep();
      return;
    }

    // Final validation
    if (!validateStep3()) return;

    setLoading(true);
    try {
  if (!otpVerified) {
        showError('Please verify your email with OTP first.');
        setLoading(false);
        return;
      }
  const otpCode = otpDigits.join('');
  const userData = { name: formData.name, email: formData.email, phone: formData.phone, location: formData.location, role: formData.role, password: formData.password, otpCode };
      await register(userData); // backend expects otpCode now
      showSuccess('Account created successfully! Welcome to EduSync!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      showError(
        error.response?.data?.message || 'Registration failed. Please try again.'
      );
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

  const validateStep1 = () => {
  const newErrors = {};
  if (!formData.name.trim()) newErrors.name = 'Full name required';
  if (!formData.email.trim()) newErrors.email = 'Email required';
  else if (!formData.email.includes('@')) newErrors.email = 'Invalid email format';
  else if (!formData.email && formData.email.toLowerCase().endsWith(allowedDomain) === false) newErrors.email = `Must end with ${allowedDomain}`;
  else if (!formData.email.toLowerCase().endsWith(allowedDomain)) newErrors.email = `Must end with ${allowedDomain}`;
  if (!formData.phone.trim()) newErrors.phone = 'Phone required';
  setErrors(prev => ({ ...prev, ...newErrors }));
  if (Object.keys(newErrors).length) return false;
    return true;
  };

  const validateStep2 = () => {
  const newErrors = {};
  if (!formData.location.trim()) newErrors.location = 'Location required';
  if (!formData.role) newErrors.role = 'Role required';
  setErrors(prev => ({ ...prev, ...newErrors }));
  if (Object.keys(newErrors).length) return false;
    return true;
  };

  const validateStep3 = () => {
  const newErrors = {};
  if (!formData.password) newErrors.password = 'Password required';
  else if (formData.password.length < 8) newErrors.password = 'At least 8 characters';
  if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
  if (!formData.agreeToTerms) newErrors.agreeToTerms = 'Required';
  if (!formData.agreeToPrivacy) newErrors.agreeToPrivacy = 'Required';
  setErrors(prev => ({ ...prev, ...newErrors }));
  if (Object.keys(newErrors).length) return false;
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
  {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep >= step
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-500'
          }`}>
            {step}
          </div>
          {step < 3 && (
            <div className={`w-12 h-1 mx-2 ${
              currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
        <p className="text-sm text-gray-600">Tell us about yourself</p>
      </div>

      <div className="form-group">
        <label htmlFor="name" className="form-label">Full Name</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiUser className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            className="form-input pl-10"
            placeholder="Enter your full name"
          />
        </div>
  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="email" className="form-label">Email Address</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiMail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="form-input pl-10"
            placeholder="Enter your email address"
          />
        </div>
  <p className="form-help">Must be institutional: {allowedDomain}</p>
  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="phone" className="form-label">Phone Number</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiPhone className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            value={formData.phone}
            onChange={handleChange}
            className="form-input pl-10"
            placeholder="Enter your phone number"
          />
        </div>
  {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Email Verification & Role</h3>
        <p className="text-sm text-gray-600">Verify your institutional email</p>
      </div>

      <div className="form-group">
        <label className="form-label flex items-center">Email OTP Verification {otpVerified && <span className="ml-2 text-green-600 text-xs font-semibold flex items-center"><FiShield className="w-4 h-4 mr-1"/>Verified</span>}</label>
        <div className="flex space-x-2">
          <input
            type="text"
            disabled
            value={formData.email}
            className="form-input flex-1 bg-gray-100"
          />
          <button
            type="button"
            onClick={async () => {
              if (resendTimer > 0 || otpVerified) return;
              if (!validateStep1()) return;
              try {
                setSendingOtp(true);
                const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/auth/request-otp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: formData.email, role: formData.role })
                });
                const data = await res.json();
                if (data.success) {
                  setOtpSent(true);
                  setResendTimer(45);
                } else {
                  showError(data.message || 'Failed to send OTP');
                }
              } catch (e) {
                showError('Failed to send OTP');
              } finally {
                setSendingOtp(false);
              }
            }}
            className={`btn btn-secondary ${resendTimer>0 || otpVerified ? 'opacity-60 cursor-not-allowed':''}`}
            disabled={sendingOtp || resendTimer>0 || otpVerified}
          >{otpVerified ? 'Verified' : sendingOtp ? 'Sending...' : resendTimer>0 ? `Resend (${resendTimer}s)` : (otpSent ? 'Resend OTP' : 'Send OTP')}</button>
        </div>
        {otpSent && !otpVerified && (
          <div className="mt-3">
            <div className="flex space-x-2 justify-between">
              {otpDigits.map((d, idx) => (
                <input
                  key={idx}
                  ref={el => otpInputsRef.current[idx] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="w-10 h-12 text-center border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={d}
                  onChange={(e)=>{
                    const val = e.target.value.replace(/[^0-9]/g,'');
                    if (!val) {
                      const copy = [...otpDigits];
                      copy[idx] = '';
                      setOtpDigits(copy);
                      return;
                    }
                    const copy = [...otpDigits];
                    copy[idx] = val;
                    setOtpDigits(copy);
                    if (idx < 5 && val) otpInputsRef.current[idx+1]?.focus();
                  }}
                  onKeyDown={(e)=>{
                    if (e.key === 'Backspace' && !otpDigits[idx] && idx>0) {
                      otpInputsRef.current[idx-1]?.focus();
                    }
                    if (e.key === 'ArrowLeft' && idx>0) otpInputsRef.current[idx-1]?.focus();
                    if (e.key === 'ArrowRight' && idx<5) otpInputsRef.current[idx+1]?.focus();
                  }}
                />
              ))}
              <button
                type="button"
                className="btn btn-primary ml-2"
                disabled={otpDigits.some(d=>d==='') || verifyingOtp}
                onClick={async ()=>{
                  try {
                    setVerifyingOtp(true);
                    const otp = otpDigits.join('');
                    const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/auth/verify-otp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: formData.email, otp, role: formData.role })
                    });
                    const data = await res.json();
                    if (data.success) {
                      setOtpVerified(true);
                    } else {
                      showError(data.message || 'Invalid OTP');
                    }
                  } catch (e) {
                    showError('OTP verification failed');
                  } finally {
                    setVerifyingOtp(false);
                  }
                }}
              >{verifyingOtp ? 'Verifying...' : 'Verify'}</button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Enter the 6-digit code sent to your email.</p>
          </div>
        )}
        <p className="form-help text-xs">Email must end with {allowedDomain}</p>
        {(formData.role === 'admin' || formData.role === 'moderator') && (
          <p className="text-xs mt-2 text-amber-600 font-medium">
            Admin/Moderator OTP is sent to the platform verification inbox (not your own email). Obtain the 6-digit code from the designated administrator.
          </p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="location" className="form-label">Location</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiMapPin className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="location"
            name="location"
            type="text"
            required
            value={formData.location}
            onChange={handleChange}
            className="form-input pl-10"
            placeholder="Enter your city/area"
          />
        </div>
  {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">I am a...</label>
        <div className="space-y-3">
          {roles.map((role) => (
            <label key={role.id} className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="role"
                value={role.id}
                checked={formData.role === role.id}
                onChange={handleChange}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <p className="font-medium text-gray-900">{role.name}</p>
                <p className="text-sm text-gray-500">{role.description}</p>
              </div>
            </label>
          ))}
        </div>
  {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Create Password</h3>
  <p className="text-sm text-gray-600">Choose a strong password for your account</p>
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">Password</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiLock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={formData.password}
            onChange={handleChange}
            className="form-input pl-10 pr-10"
            placeholder="Create a password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            ) : (
              <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>
        <div className="mt-2">
          <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
            <div
              className={`h-2 transition-all duration-300 ${strengthMeta.color}`}
              style={{ width: `${strengthMeta.bar}%` }}
            />
          </div>
          <p className="text-xs mt-1 font-medium text-gray-600 flex items-center">
            Strength: <span className="ml-1 text-gray-900">{strengthMeta.label}</span>
          </p>
          <p className="form-help">Min 8 chars, include upper, number, symbol. 3 of 4 rules needed.</p>
        </div>
  {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
      </div>

  <div className="form-group">
        <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiLock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className="form-input pl-10 pr-10"
            placeholder="Confirm your password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            ) : (
              <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>
  {errors.confirmPassword && <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>}
      </div>

      <div className="space-y-4">
        <div className="flex items-start">
          <input
            id="agreeToTerms"
            name="agreeToTerms"
            type="checkbox"
            checked={formData.agreeToTerms}
            onChange={handleChange}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="agreeToTerms" className="ml-2 text-sm text-gray-900">
            I agree to the{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </Link>
          </label>
        </div>
  {errors.agreeToTerms && <p className="text-xs text-red-600 -mt-2">{errors.agreeToTerms}</p>}

        <div className="flex items-start">
          <input
            id="agreeToPrivacy"
            name="agreeToPrivacy"
            type="checkbox"
            checked={formData.agreeToPrivacy}
            onChange={handleChange}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="agreeToPrivacy" className="ml-2 text-sm text-gray-900">
            I agree to the{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </Link>
          </label>
        </div>
  {errors.agreeToPrivacy && <p className="text-xs text-red-600 -mt-2">{errors.agreeToPrivacy}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">EduSync</h1>
          <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card">
          <div className="card-body">
            {renderStepIndicator()}
            
            <form onSubmit={handleSubmit}>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}

              <div className="flex justify-between mt-8">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="btn btn-secondary"
                  >
                    Previous
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={loading}
                  className={`btn btn-primary ${currentStep === 1 ? 'w-full' : 'ml-auto'}`}
                >
                  {currentStep === 3 ? (loading ? 'Creating...' : 'Create Account') : 'Next'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="mt-12 max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Join the Campus Community
          </h3>
          <p className="text-gray-600">
            Connect, trade, and thrive with fellow students
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📚</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Study Materials</h4>
            <p className="text-sm text-gray-600">Buy and sell textbooks, notes</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🍕</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Food Delivery</h4>
            <p className="text-sm text-gray-600">Order from campus restaurants</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🏠</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Housing</h4>
            <p className="text-sm text-gray-600">Find rooms and roommates</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💼</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Job Opportunities</h4>
            <p className="text-sm text-gray-600">Part-time jobs and internships</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

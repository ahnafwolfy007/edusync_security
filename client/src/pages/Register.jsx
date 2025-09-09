import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone, FiMapPin } from 'react-icons/fi';
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
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    email: '',
    phone: '',
    // Step 2: Location & Role
    university: '',
    location: '',
    role: 'student',
    // Step 3: Password
    password: '',
    confirmPassword: '',
    // Terms
    agreeToTerms: false,
    agreeToPrivacy: false
  });

  const universities = [
    'University of Dhaka',
    'Bangladesh University of Engineering and Technology (BUET)',
    'United International University (UIU)',
    'Dhaka University of Engineering & Technology (DUET)',
    'North South University',
    'BRAC University',
    'Independent University Bangladesh (IUB)',
    'East West University',
    'American International University-Bangladesh (AIUB)',
    'Daffodil International University',
    'Other'
  ];

  const roles = [
    { id: 'student', name: 'Student', description: 'I am a university student' },
    { id: 'business_owner', name: 'Business Owner', description: 'I want to sell products/services' },
    { id: 'moderator', name: 'Teacher/Staff', description: 'I am university faculty/staff' }
  ];

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
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        university: formData.university,
        location: formData.location,
        role: formData.role,
        password: formData.password
      };

      await register(userData);
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
    if (!formData.name.trim()) {
      showError('Please enter your full name');
      return false;
    }
    if (!formData.email.trim()) {
      showError('Please enter your email address');
      return false;
    }
    if (!formData.email.includes('@')) {
      showError('Please enter a valid email address');
      return false;
    }
    if (!formData.phone.trim()) {
      showError('Please enter your phone number');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.university) {
      showError('Please select your university');
      return false;
    }
    if (!formData.location.trim()) {
      showError('Please enter your location');
      return false;
    }
    if (!formData.role) {
      showError('Please select your role');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.password) {
      showError('Please enter a password');
      return false;
    }
    if (formData.password.length < 6) {
      showError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      showError('Passwords do not match');
      return false;
    }
    if (!formData.agreeToTerms) {
      showError('Please agree to the Terms of Service');
      return false;
    }
    if (!formData.agreeToPrivacy) {
      showError('Please agree to the Privacy Policy');
      return false;
    }
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
        <p className="form-help">Use your university email if available</p>
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
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">University & Role</h3>
        <p className="text-sm text-gray-600">Help us customize your experience</p>
      </div>

      <div className="form-group">
        <label htmlFor="university" className="form-label">University</label>
        <select
          id="university"
          name="university"
          required
          value={formData.university}
          onChange={handleChange}
          className="form-input"
        >
          <option value="">Select your university</option>
          {universities.map((uni) => (
            <option key={uni} value={uni}>{uni}</option>
          ))}
        </select>
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
        <p className="form-help">Minimum 6 characters</p>
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
                  {loading ? 'Creating Account...' : 
                   currentStep === 3 ? 'Create Account' : 'Next'}
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

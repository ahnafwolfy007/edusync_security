import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { 
  FiUpload, 
  FiX, 
  FiImage, 
  FiTrash2, 
  FiCamera,
  FiDollarSign,
  FiTag,
  FiPackage,
  FiMapPin,
  FiStar,
  FiCheck
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../api';

const ItemUploadForm = ({ isOpen, onClose, onSuccess, apiEndpoint = '/marketplace/items', title = 'Sell Your Item' }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'books',
    condition: 'new',
    location: '',
    tags: [],
    images: []
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tagInput, setTagInput] = useState('');

  const categories = [
    { value: 'books', label: 'Books & Materials', icon: '📚', color: 'bg-blue-100 text-blue-800' },
    { value: 'electronics', label: 'Electronics', icon: '💻', color: 'bg-purple-100 text-purple-800' },
    { value: 'furniture', label: 'Furniture', icon: '🪑', color: 'bg-orange-100 text-orange-800' },
    { value: 'clothes', label: 'Clothing', icon: '👕', color: 'bg-pink-100 text-pink-800' },
    { value: 'sports', label: 'Sports & Fitness', icon: '⚽', color: 'bg-green-100 text-green-800' },
    { value: 'other', label: 'Other', icon: '📦', color: 'bg-gray-100 text-gray-800' }
  ];

  const conditions = [
    { value: 'new', label: 'Brand New', description: 'Never used, in original packaging', color: 'text-green-600' },
    { value: 'like-new', label: 'Like New', description: 'Barely used, excellent condition', color: 'text-blue-600' },
    { value: 'good', label: 'Good', description: 'Used with minor wear', color: 'text-yellow-600' },
    { value: 'fair', label: 'Fair', description: 'Used with visible wear', color: 'text-orange-600' }
  ];

  const steps = [
    { number: 1, title: 'Basic Info', icon: FiPackage },
    { number: 2, title: 'Images', icon: FiCamera },
    { number: 3, title: 'Details', icon: FiTag },
    { number: 4, title: 'Review', icon: FiCheck }
  ];

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.slice(0, 5 - imageFiles.length);
    
    if (newFiles.length + imageFiles.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const newPreviews = newFiles.map(file => {
      const preview = URL.createObjectURL(file);
      return {
        file,
        preview,
        id: Date.now() + Math.random()
      };
    });

    setImageFiles(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  }, [imageFiles.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const removeImage = (indexToRemove) => {
    const preview = imagePreviews[indexToRemove];
    if (preview?.preview) {
      URL.revokeObjectURL(preview.preview);
    }
    
    setImageFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim()) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsUploading(true);
      
      // Validate required fields
      if (!formData.title || !formData.description || !formData.price) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (parseFloat(formData.price) <= 0) {
        toast.error('Price must be greater than 0');
        return;
      }

      // Create FormData for multipart upload
      const submitData = new FormData();
      
      // Add form fields with proper field mapping based on API endpoint
      if (apiEndpoint === '/secondhand') {
        // Secondhand API field mapping
        submitData.append('item_name', formData.title.trim());
        submitData.append('description', formData.description.trim());
        submitData.append('price', parseFloat(formData.price));
        submitData.append('condition', formData.condition);
        if (formData.category && formData.category !== 'electronics') {
          // For secondhand, we might need to map categories differently or use category_id
          submitData.append('category_id', null); // Will need proper category mapping later
        }
        if (formData.description) {
          submitData.append('terms_conditions', 'Standard terms and conditions apply.');
        }
      } else {
        // Marketplace API field mapping (original)
        submitData.append('title', formData.title.trim());
        submitData.append('description', formData.description.trim());
        submitData.append('price', parseFloat(formData.price));
        submitData.append('category', formData.category);
        submitData.append('condition', formData.condition);
        submitData.append('location', formData.location.trim());
        submitData.append('tags', JSON.stringify(formData.tags));
      }
      
      // Add image files
      imageFiles.forEach((file, index) => {
        submitData.append('images', file);
      });

      const response = await api.post(apiEndpoint, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setUploadProgress(progress);
        }
      });

      if (response.data.success) {
        toast.success('Item posted successfully!');
        onSuccess();
        handleClose();
      }
    } catch (error) {
      console.error('Failed to post item:', error);
      toast.error(error.response?.data?.message || 'Failed to post item');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    // Clean up object URLs
    imagePreviews.forEach(preview => {
      if (preview.preview) {
        URL.revokeObjectURL(preview.preview);
      }
    });
    
    // Reset form
    setCurrentStep(1);
    setFormData({
      title: '',
      description: '',
      price: '',
      category: 'books',
      condition: 'new',
      location: '',
      tags: [],
      images: []
    });
    setImageFiles([]);
    setImagePreviews([]);
    setUploadProgress(0);
    setTagInput('');
    onClose();
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const canProceedFromStep = (step) => {
    switch (step) {
      case 1:
        return formData.title && formData.description && formData.price;
      case 2:
        return true; // Images are optional
      case 3:
        return true; // Additional details are optional
      default:
        return true;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="text-blue-100">Share your items with the community</p>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors p-2"
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                      ${currentStep >= step.number 
                        ? 'bg-white text-blue-600' 
                        : 'bg-blue-500 text-white'
                      }
                    `}>
                      {currentStep > step.number ? (
                        <FiCheck size={16} />
                      ) : (
                        <step.icon size={16} />
                      )}
                    </div>
                    <div className="ml-2 hidden sm:block">
                      <p className="text-sm font-medium">{step.title}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`
                      flex-1 h-1 mx-4 rounded
                      ${currentStep > step.number ? 'bg-white' : 'bg-blue-500'}
                    `} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiPackage className="inline mr-2" />
                    Item Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter a clear, descriptive title"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your item's condition, features, and any relevant details"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500 characters</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiDollarSign className="inline mr-2" />
                      Price (৳) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FiMapPin className="inline mr-2" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Campus Building, Room number"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    <FiCamera className="inline mr-2" />
                    Item Images (Optional)
                  </label>
                  
                  {/* Image Upload Zone */}
                  <div
                    {...getRootProps()}
                    className={`
                      border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                      ${isDragActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input {...getInputProps()} />
                    <FiUpload className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-600 font-medium">
                      {isDragActive 
                        ? 'Drop images here...' 
                        : 'Drag & drop images or click to browse'
                      }
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Maximum 5 images, 10MB each (JPG, PNG, GIF, WebP)
                    </p>
                  </div>

                  {/* Image Previews */}
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
                      {imagePreviews.map((preview, index) => (
                        <div key={preview.id} className="relative group">
                          <img
                            src={preview.preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <FiX size={12} />
                          </button>
                          {index === 0 && (
                            <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                              Main
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Progress */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>Uploading images...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <FiTag className="inline mr-2" />
                    Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categories.map(category => (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => handleInputChange('category', category.value)}
                        className={`
                          p-4 rounded-lg border-2 text-left transition-all
                          ${formData.category === category.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{category.icon}</span>
                          <div>
                            <p className="font-medium text-gray-900">{category.label}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <FiStar className="inline mr-2" />
                    Condition
                  </label>
                  <div className="space-y-3">
                    {conditions.map(condition => (
                      <button
                        key={condition.value}
                        type="button"
                        onClick={() => handleInputChange('condition', condition.value)}
                        className={`
                          w-full p-4 rounded-lg border-2 text-left transition-all
                          ${formData.condition === condition.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`font-medium ${condition.color}`}>{condition.label}</p>
                            <p className="text-sm text-gray-600">{condition.description}</p>
                          </div>
                          {formData.condition === condition.value && (
                            <FiCheck className="text-blue-500" size={20} />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (Optional)
                  </label>
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add a tag and press Enter"
                      maxLength={20}
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      disabled={!tagInput.trim() || formData.tags.length >= 5}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                  
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <FiX size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Maximum 5 tags, 20 characters each</p>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Review Your Listing</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Title</p>
                        <p className="text-gray-900">{formData.title}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-500">Description</p>
                        <p className="text-gray-900 text-sm">{formData.description}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Price</p>
                          <p className="text-2xl font-bold text-green-600">৳{formData.price}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Condition</p>
                          <p className="text-gray-900 capitalize">{formData.condition.replace('-', ' ')}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-gray-500">Category</p>
                        <div className="flex items-center mt-1">
                          <span className="mr-2">{categories.find(c => c.value === formData.category)?.icon}</span>
                          <span>{categories.find(c => c.value === formData.category)?.label}</span>
                        </div>
                      </div>

                      {formData.location && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Location</p>
                          <p className="text-gray-900">{formData.location}</p>
                        </div>
                      )}

                      {formData.tags.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Tags</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {formData.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-3">
                        Images ({imagePreviews.length})
                      </p>
                      {imagePreviews.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {imagePreviews.map((preview, index) => (
                            <img
                              key={preview.id}
                              src={preview.preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-24 bg-gray-100 rounded-lg">
                          <div className="text-center">
                            <FiImage className="mx-auto text-gray-400 mb-2" size={24} />
                            <p className="text-sm text-gray-500">No images</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Previous
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
            
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                disabled={!canProceedFromStep(currentStep)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isUploading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Posting...
                  </>
                ) : (
                  'Post Item'
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ItemUploadForm;

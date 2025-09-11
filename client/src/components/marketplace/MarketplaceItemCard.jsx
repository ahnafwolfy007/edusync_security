import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiHeart, 
  FiEye, 
  FiMapPin, 
  FiClock, 
  FiTag,
  FiStar,
  FiImage
} from 'react-icons/fi';

const MarketplaceItemCard = ({ item, onBuy, showBuyButton = true, isOwner = false }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const images = item.images && Array.isArray(item.images) ? item.images : 
                 (item.images ? JSON.parse(item.images) : []);

  const hasImages = images.length > 0;

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'new': return 'bg-green-100 text-green-800';
      case 'like-new': return 'bg-blue-100 text-blue-800';
      case 'good': return 'bg-yellow-100 text-yellow-800';
      case 'fair': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      books: '📚',
      electronics: '💻',
      furniture: '🪑',
      clothes: '👕',
      sports: '⚽',
      other: '📦'
    };
    return icons[category] || '📦';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const nextImage = () => {
    if (hasImages) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (hasImages) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      {/* Image Section */}
      <div className="relative aspect-w-1 aspect-h-1 bg-gray-100">
        {hasImages && !imageError ? (
          <div className="relative w-full h-48 overflow-hidden">
            <img
              src={images[currentImageIndex]}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              onError={() => setImageError(true)}
            />
            
            {/* Image Navigation */}
            {images.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 hover:opacity-100 transition-opacity">
                <button
                  onClick={prevImage}
                  className="bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Image Indicators */}
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Image Count Badge */}
            {images.length > 1 && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full flex items-center">
                <FiImage size={10} className="mr-1" />
                {images.length}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <FiImage size={32} className="mx-auto mb-2" />
              <p className="text-sm">No image</p>
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(item.condition)}`}>
            <FiStar size={10} className="mr-1" />
            {item.condition?.replace('-', ' ')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
              {item.title}
            </h3>
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <span className="mr-2">{getCategoryIcon(item.category)}</span>
              <FiTag size={12} className="mr-1" />
              <span className="capitalize">{item.category}</span>
            </div>
          </div>
          <div className="text-right ml-4">
            <p className="text-2xl font-bold text-green-600">৳{item.price}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {item.description}
        </p>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{item.tags.length - 3} more</span>
            )}
          </div>
        )}

        {/* Meta Information */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <div className="flex items-center">
            <FiClock size={12} className="mr-1" />
            {formatDate(item.created_at)}
          </div>
          {item.location && (
            <div className="flex items-center">
              <FiMapPin size={12} className="mr-1" />
              <span className="truncate max-w-20">{item.location}</span>
            </div>
          )}
        </div>

        {/* Seller Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
              <span className="text-blue-600 font-medium text-xs">
                {item.seller_name?.charAt(0)?.toUpperCase() || 'S'}
              </span>
            </div>
            <span className="truncate">{item.seller_name || 'Seller'}</span>
          </div>
          {!isOwner && (
            <button className="text-gray-400 hover:text-red-500 transition-colors">
              <FiHeart size={16} />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {showBuyButton && !isOwner && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onBuy(item)}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center"
            >
              <FiEye size={16} className="mr-2" />
              Buy Now
            </motion.button>
          )}
          
          {isOwner && (
            <div className="flex space-x-2 w-full">
              <button className="flex-1 bg-gray-100 text-gray-600 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                Edit
              </button>
              <button className="flex-1 bg-red-100 text-red-600 py-2 px-4 rounded-lg font-medium hover:bg-red-200 transition-colors">
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Status for owner */}
        {isOwner && (
          <div className="mt-3 text-center">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              item.status === 'available' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {item.status === 'available' ? 'Active' : 'Sold'}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MarketplaceItemCard;

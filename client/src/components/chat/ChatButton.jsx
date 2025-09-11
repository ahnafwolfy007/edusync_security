import React, { useState } from 'react';
import { FiMessageCircle, FiLoader } from 'react-icons/fi';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const ChatButton = ({ 
  sellerId, 
  sellerName, 
  sellerType, 
  itemId = null, 
  itemName = null,
  className = '',
  size = 'sm',
  variant = 'outline'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { startChat } = useChat();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStartChat = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.userId === sellerId || user.user_id === sellerId) {
      return; // Don't allow chatting with yourself
    }

    try {
      setIsLoading(true);
      
      // Create context-aware chat data
      const chatContext = {
        sellerId,
        sellerName,
        sellerType,
        itemId,
        itemName
      };
      
      // Start chat and navigate to chat page
      const chatId = await startChat(sellerId, sellerType, chatContext);
      
      if (chatId) {
        navigate('/chat');
      } else {
        console.error('Failed to create chat');
      }
      
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Size variants
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  // Style variants
  const variantClasses = {
    outline: `border border-blue-500 text-blue-600 hover:bg-blue-50 hover:border-blue-600`,
    filled: `bg-blue-500 text-white hover:bg-blue-600`,
    ghost: `text-blue-600 hover:bg-blue-50`,
    minimal: `text-gray-600 hover:text-blue-600 hover:bg-blue-50`
  };

  // Icon sizes based on button size
  const iconSizes = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleStartChat}
        disabled={isLoading || (user && (user.userId === sellerId || user.user_id === sellerId))}
        className={`
          inline-flex items-center gap-2 rounded-lg font-medium transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
        title={itemName ? `Chat about ${itemName}` : `Chat with ${sellerName}`}
      >
        {isLoading ? (
          <FiLoader className="animate-spin" size={iconSizes[size]} />
        ) : (
          <FiMessageCircle size={iconSizes[size]} />
        )}
        {size !== 'xs' && (
          <span>
            {isLoading ? 'Starting...' : 'Chat'}
          </span>
        )}
      </motion.button>
    </>
  );
};

export default ChatButton;

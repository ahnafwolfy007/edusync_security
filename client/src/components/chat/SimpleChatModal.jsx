import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiSend, FiMessageCircle } from 'react-icons/fi';

const SimpleChatModal = ({ 
  isOpen, 
  onClose, 
  sellerName, 
  sellerType, 
  itemName 
}) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      content: message.trim(),
      sender: 'You',
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages([...messages, newMessage]);
    setMessage('');
    
    // Simulate seller response (for demo)
    setTimeout(() => {
      const response = {
        id: Date.now() + 1,
        content: `Hi! Thanks for your interest in ${itemName}. How can I help you?`,
        sender: sellerName,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  const getSellerTypeInfo = (type) => {
    switch(type) {
      case 'secondhand':
        return { name: 'Secondhand Seller', color: 'text-green-600', bg: 'bg-green-50' };
      case 'business':
        return { name: 'Business Owner', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'food':
        return { name: 'Food Vendor', color: 'text-orange-600', bg: 'bg-orange-50' };
      default:
        return { name: 'Seller', color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  const typeInfo = getSellerTypeInfo(sellerType);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-md w-full max-h-[600px] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className={`${typeInfo.bg} ${typeInfo.color} p-4 border-b`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${typeInfo.color.replace('text-', 'bg-').replace('600', '500')} bg-opacity-20 rounded-lg`}>
                <FiMessageCircle size={20} />
              </div>
              <div>
                <h3 className="font-semibold">{sellerName}</h3>
                <p className="text-sm opacity-80">{typeInfo.name}</p>
                {itemName && (
                  <p className="text-xs opacity-70">About: {itemName}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-black hover:bg-opacity-10 rounded-lg transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-3 max-h-80 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <FiMessageCircle size={48} className="mx-auto mb-2 opacity-30" />
              <p>Start a conversation!</p>
              <p className="text-sm">Send your first message below</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-2xl ${
                    msg.sender === 'You'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender === 'You' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {msg.timestamp}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSend} className="p-4 border-t">
          <div className="flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!message.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <FiSend size={16} />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default SimpleChatModal;

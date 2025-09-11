import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import SellerDirectory from '../components/SellerDirectory';
import { 
  FiMessageSquare, 
  FiShoppingBag, 
  FiTruck, 
  FiCoffee, 
  FiSend, 
  FiPlus,
  FiUser,
  FiSearch,
  FiUsers
} from 'react-icons/fi';

const Chat = () => {
  const { chats, activeChatId, setActiveChatId, messages, startChat, sendMessage, sending } = useChat();
  const { user } = useAuth();
  const [draft, setDraft] = useState('');
  const [otherUser, setOtherUser] = useState('');
  const [selectedSellerType, setSelectedSellerType] = useState('all');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showSellerDirectory, setShowSellerDirectory] = useState(false);

  const sellerTypes = [
    { id: 'all', name: 'All Sellers', icon: FiUser, color: 'bg-gray-500' },
    { id: 'secondhand', name: 'Secondhand Items', icon: FiShoppingBag, color: 'bg-green-500' },
    { id: 'business', name: 'Business Services', icon: FiTruck, color: 'bg-blue-500' },
    { id: 'food', name: 'Food Vendors', icon: FiCoffee, color: 'bg-orange-500' }
  ];

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await sendMessage(draft);
    setDraft('');
  };

  const handleStartChat = async (e) => {
    e.preventDefault();
    if (!otherUser.trim()) return;
    const chatContext = {
      sellerId: otherUser.trim(),
      sellerName: otherUser.trim(),
      sellerType: selectedSellerType
    };
    await startChat(otherUser.trim(), selectedSellerType, chatContext);
    setOtherUser('');
    setShowNewChatModal(false);
  };

  const handleStartChatFromDirectory = async (sellerId, sellerType, sellerName) => {
    const chatContext = {
      sellerId,
      sellerName,
      sellerType
    };
    await startChat(sellerId, sellerType, chatContext);
    setShowSellerDirectory(false);
  };

  const getSellerTypeInfo = (type) => {
    return sellerTypes.find(s => s.id === type) || sellerTypes[0];
  };

  const filteredChats = selectedSellerType === 'all' 
    ? chats 
    : chats.filter(chat => chat.sellerType === selectedSellerType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300 rounded-full opacity-20"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ 
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div 
          className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-300 rounded-full opacity-20"
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{ 
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Seller Communication Hub
          </h1>
          <p className="text-gray-600 mb-6">Connect with different types of sellers on EduSync</p>
        </motion.div>

        {/* Seller Type Filter */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-4 mb-6 justify-center"
        >
          {sellerTypes.map((type) => {
            const Icon = type.icon;
            return (
              <motion.button
                key={type.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedSellerType(type.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  selectedSellerType === type.id
                    ? `${type.color} text-white shadow-lg`
                    : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white border border-gray-200'
                }`}
              >
                <Icon size={18} />
                {type.name}
              </motion.button>
            );
          })}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSellerDirectory(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <FiUsers size={18} />
            Browse Sellers
          </motion.button>
        </motion.div>
        {/* Main Chat Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
          {/* Chat List Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <FiMessageSquare />
                Conversations
              </h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowNewChatModal(true)}
                className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all duration-300"
              >
                <FiPlus size={16} />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {filteredChats.map((chat, index) => {
                const sellerInfo = getSellerTypeInfo(chat.sellerType);
                const Icon = sellerInfo.icon;
                const isItemChat = chat.itemId && chat.itemName;
                
                return (
                  <motion.button
                    key={chat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                      chat.id === activeChatId
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent shadow-lg'
                        : 'bg-white/50 hover:bg-white/80 border-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${chat.id === activeChatId ? 'bg-white/20' : sellerInfo.color}`}>
                        <Icon size={16} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {chat.sellerName || chat.otherUserName || `Chat ${chat.id.slice(0, 8)}`}
                        </div>
                        <div className={`text-sm flex items-center gap-2 ${chat.id === activeChatId ? 'text-white/80' : 'text-gray-500'}`}>
                          <span>{sellerInfo.name}</span>
                          {isItemChat && (
                            <>
                              <span>•</span>
                              <span className="truncate" title={chat.itemName}>
                                {chat.itemName.length > 15 ? `${chat.itemName.substring(0, 15)}...` : chat.itemName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm truncate ${chat.id === activeChatId ? 'text-white/80' : 'text-gray-500'}`}>
                      {chat.lastMessage || 'No messages yet'}
                    </div>
                    {isItemChat && (
                      <div className={`mt-2 text-xs ${chat.id === activeChatId ? 'text-white/60' : 'text-gray-400'}`}>
                        💬 About: {chat.itemName}
                      </div>
                    )}
                  </motion.button>
                );
              })}
              {filteredChats.length === 0 && (
                <div className="text-gray-400 text-center py-8">
                  <FiMessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No conversations yet</p>
                  <p className="text-sm mb-4">Start a new chat to begin</p>
                  <div className="space-y-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowSellerDirectory(true)}
                      className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-2 px-4 rounded-lg font-medium hover:shadow-lg transition-all duration-300"
                    >
                      Browse Sellers
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowNewChatModal(true)}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 px-4 rounded-lg font-medium hover:shadow-lg transition-all duration-300"
                    >
                      Start New Chat
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Chat Messages Area */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl flex flex-col"
          >
            {activeChatId ? (
              <>
                {/* Chat Header */}
                <div className="p-6 border-b border-gray-200/50">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const activeChat = chats.find(c => c.id === activeChatId);
                      const sellerInfo = getSellerTypeInfo(activeChat?.sellerType);
                      const Icon = sellerInfo.icon;
                      const isItemChat = activeChat?.itemId && activeChat?.itemName;
                      return (
                        <>
                          <div className={`p-3 rounded-xl ${sellerInfo.color}`}>
                            <Icon size={20} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800">
                              {activeChat?.sellerName || activeChat?.otherUserName || 'Unknown User'}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>{sellerInfo.name}</span>
                              {isItemChat && (
                                <>
                                  <span>•</span>
                                  <span className="text-blue-600 font-medium">
                                    About: {activeChat.itemName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {isItemChat && (
                            <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                              Item Chat
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((message, index) => {
                    const isOwn = message.senderId === (user?.user_id || user?.userId);
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                            isOwn
                              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                            {message.createdAt?.seconds 
                              ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : message.createdAt?.toDate 
                                ? message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Sending...'
                            }
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      <FiMessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                      <p>Start the conversation!</p>
                      <p className="text-sm">Send your first message below</p>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <motion.form 
                  onSubmit={handleSend} 
                  className="p-6 border-t border-gray-200/50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex gap-3">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      disabled={sending}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      disabled={!draft.trim() || sending}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                      type="submit"
                    >
                      <FiSend size={16} />
                      {sending ? 'Sending...' : 'Send'}
                    </motion.button>
                  </div>
                </motion.form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FiMessageSquare size={64} className="mx-auto mb-4 opacity-30" />
                  <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
                  <p>Choose a chat from the sidebar or start a new one</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* New Chat Modal */}
        {showNewChatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewChatModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Start New Chat
              </h3>
              <form onSubmit={handleStartChat} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seller Type
                  </label>
                  <select
                    value={selectedSellerType}
                    onChange={(e) => setSelectedSellerType(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {sellerTypes.filter(type => type.id !== 'all').map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seller ID or Username
                  </label>
                  <input
                    value={otherUser}
                    onChange={(e) => setOtherUser(e.target.value)}
                    placeholder="Enter seller ID or username"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewChatModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium"
                  >
                    Start Chat
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Seller Directory Modal */}
        {showSellerDirectory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowSellerDirectory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-transparent max-w-6xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSellerDirectory(false)}
                  className="bg-white/90 backdrop-blur-sm text-gray-700 rounded-full p-3 shadow-lg hover:bg-white transition-all duration-300"
                >
                  ✕
                </motion.button>
              </div>
              <SellerDirectory onStartChat={handleStartChatFromDirectory} />
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Chat;

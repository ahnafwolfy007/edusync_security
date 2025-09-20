import React, { useMemo, useState } from 'react';
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
import { FiMapPin, FiBook, FiShield } from 'react-icons/fi';

const Chat = () => {
  const { chats, activeChatId, setActiveChatId, messages, startChat, sendMessage, sending } = useChat();
  const { user, isAdmin, isModerator } = useAuth();
  const [draft, setDraft] = useState('');
  const [otherUser, setOtherUser] = useState('');
  const [selectedSellerType, setSelectedSellerType] = useState('all');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showSellerDirectory, setShowSellerDirectory] = useState(false);
  const [activeTab, setActiveTab] = useState('community'); // 'community' | 'sellers'

  // Community state
  const [activeCommunityId, setActiveCommunityId] = useState(null);
  const [communityDraft, setCommunityDraft] = useState('');
  const [communityMessages, setCommunityMessages] = useState({}); // { [communityId]: [{ id, sender, content, createdAt }] }

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

  const handleSendCommunity = (e) => {
    e.preventDefault();
    if (!communityDraft.trim() || !activeCommunityId) return;
    // Append to local messages (dummy frontend-only for now)
    const msg = {
      id: `local_${Date.now()}`,
      sender: user?.name || 'You',
      senderId: user?.user_id || user?.userId || 'me',
      content: communityDraft.trim(),
      createdAt: new Date()
    };
    setCommunityMessages((prev) => ({
      ...prev,
      [activeCommunityId]: [ ...(prev[activeCommunityId] || []), msg ]
    }));
    setCommunityDraft('');
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

  // -------- Community helpers (frontend only for now) --------
  const extractBatchFromEmail = (email) => {
    if (!email) return null;
    // Find the first occurrence of 3 consecutive digits in the email
    const m = String(email).match(/(\d{3})/);
    return m ? m[1] : null;
  };

  const roleName = (user?.role_name || user?.role || '').toLowerCase();
  const isTeacher = roleName.includes('teacher') || roleName.includes('faculty');
  const treatAsStudent = roleName === 'student' || roleName === 'business_owner' || roleName === 'food_vendor' || roleName === '';

  const computedCommunities = useMemo(() => {
    // Admin sees a broader set; others see their own two.
    const sampleLocations = ['Dhaka', 'Chittagong', 'Comilla', 'Mymensingh', 'Sylhet'];
    const sampleBatches = ['221', '222', '223', '224', '225'];

    const userLoc = user?.location || 'Unknown';
    const userBatch = extractBatchFromEmail(user?.email);

    const forUser = [];
    // Location community (all roles included)
    forUser.push({
      id: `loc_${(userLoc || 'unknown').toLowerCase()}`,
      name: `Community - ${userLoc}`,
      type: 'location',
      icon: 'location',
      description: 'Students, teachers, and staff near you'
    });

    // Role/batch based
    if (isTeacher) {
      forUser.push({ id: 'faculties', name: 'Faculties', type: 'faculties', icon: 'shield', description: 'All teachers community' });
    } else if (treatAsStudent) {
      forUser.push({ id: `batch_${userBatch || 'unknown'}`, name: `Batch-${userBatch || 'Unknown'}`, type: 'batch', icon: 'book', description: 'Peers from your batch' });
    } else {
      // Fallback to batch-like group if role unknown
      forUser.push({ id: `batch_${userBatch || 'unknown'}`, name: `Batch-${userBatch || 'Unknown'}`, type: 'batch', icon: 'book', description: 'Peers from your batch' });
    }

    if (isAdmin && isAdmin()) {
      // Admin: show all communities (dummy superset)
      const locs = sampleLocations.map(l => ({ id: `loc_${l.toLowerCase()}`, name: `Community - ${l}`, type: 'location', icon: 'location', description: 'Regional community' }));
      const batches = sampleBatches.map(b => ({ id: `batch_${b}`, name: `Batch-${b}`, type: 'batch', icon: 'book', description: 'Batch community' }));
      const extra = [{ id: 'faculties', name: 'Faculties', type: 'faculties', icon: 'shield', description: 'All teachers community' }];
      // Ensure user's own groups are prioritized first
      const all = [...forUser, ...locs, ...batches, ...extra];
      const uniq = [];
      const seen = new Set();
      for (const c of all) {
        if (!seen.has(c.id)) { seen.add(c.id); uniq.push(c); }
      }
      return uniq;
    }

    // Moderators and others: only their two communities
    return forUser;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.location, user?.email, user?.role, user?.role_name]);

  // Seed dummy messages for communities on first compute
  React.useEffect(() => {
    setCommunityMessages(prev => {
      const next = { ...prev };
      for (const c of computedCommunities) {
        if (!next[c.id]) {
          next[c.id] = [
            { id: `${c.id}_m1`, sender: 'System', content: `Welcome to ${c.name}!`, createdAt: new Date(Date.now() - 1000 * 60 * 60) },
            { id: `${c.id}_m2`, sender: 'Moderator', content: 'Be respectful and follow community guidelines.', createdAt: new Date(Date.now() - 1000 * 60 * 45) },
            { id: `${c.id}_m3`, sender: 'Alice', content: 'Hi everyone! 👋', createdAt: new Date(Date.now() - 1000 * 60 * 30) },
          ];
        }
      }
      return next;
    });
    // Auto-select first community if none selected
    if (!activeCommunityId && computedCommunities.length) {
      setActiveCommunityId(computedCommunities[0].id);
    }
  }, [computedCommunities, activeCommunityId]);

  const getCommunityIcon = (type) => {
    if (type === 'location') return FiMapPin;
    if (type === 'batch') return FiBook;
    if (type === 'faculties') return FiShield;
    return FiUsers;
  };

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
          <div className="flex items-center justify-center gap-3 mb-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('community')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${activeTab === 'community' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'bg-white/80 backdrop-blur-sm text-gray-700 border border-gray-200'}`}
            >
              Community
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('sellers')}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${activeTab === 'sellers' ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' : 'bg-white/80 backdrop-blur-sm text-gray-700 border border-gray-200'}`}
            >
              Sellers
            </motion.button>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            {activeTab === 'community' ? 'Community Chats' : 'Seller Communication Hub'}
          </h1>
          <p className="text-gray-600 mb-6">
            {activeTab === 'community' ? 'Join your location and batch/faculty communities' : 'Connect with different types of sellers on EduSync'}
          </p>
        </motion.div>
        {activeTab === 'sellers' && (
          // Seller Type Filter
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
        )}
        {/* Main Chat Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
          {/* Chat List Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6 flex flex-col"
          >
            {activeTab === 'community' ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <FiUsers />
                    Communities
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3">
                  {computedCommunities.map((c, idx) => {
                    const Icon = getCommunityIcon(c.type);
                    const active = c.id === activeCommunityId;
                    return (
                      <motion.button
                        key={c.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setActiveCommunityId(c.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                          active ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent shadow-lg' : 'bg-white/50 hover:bg-white/80 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <div className={`p-2 rounded-lg ${active ? 'bg-white/20' : 'bg-blue-500'}`}>
                            <Icon size={16} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{c.name}</div>
                            <div className={`text-sm ${active ? 'text-white/80' : 'text-gray-500'}`}>{c.description}</div>
                          </div>
                        </div>
                        <div className={`text-sm truncate ${active ? 'text-white/80' : 'text-gray-500'}`}>
                          {(communityMessages[c.id]?.slice(-1)[0]?.content) || 'No messages yet'}
                        </div>
                      </motion.button>
                    );
                  })}
                  {computedCommunities.length === 0 && (
                    <div className="text-gray-400 text-center py-8">
                      <FiMessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="font-medium">No communities available</p>
                      <p className="text-sm">Please sign in or complete your profile</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </motion.div>

          {/* Chat Messages Area */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl flex flex-col"
          >
            {activeTab === 'community' ? (
              // Community chat area
              (activeCommunityId ? (
                <>
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200/50">
                    {(() => {
                      const c = computedCommunities.find(x => x.id === activeCommunityId);
                      const Icon = getCommunityIcon(c?.type);
                      return (
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-xl bg-blue-500`}>
                            <Icon size={20} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-800">{c?.name || 'Community'}</h3>
                            <div className="text-sm text-gray-500">{c?.description || 'Community chat'}</div>
                          </div>
                          {isAdmin && isAdmin() && (
                            <div className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">Admin View</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {(communityMessages[activeCommunityId] || []).map((m, idx) => {
                      const isOwn = (m.senderId && (m.senderId === (user?.user_id || user?.userId))) || (m.sender === (user?.name));
                      return (
                        <motion.div
                          key={m.id || idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${isOwn ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                            <p className="text-xs font-semibold mb-1">{isOwn ? 'You' : (m.sender || 'Member')}</p>
                            <p className="text-sm">{m.content}</p>
                            <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                              {m.createdAt instanceof Date ? m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                    {(!communityMessages[activeCommunityId] || communityMessages[activeCommunityId].length === 0) && (
                      <div className="text-center text-gray-400 py-8">
                        <FiMessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                        <p>Start the conversation!</p>
                        <p className="text-sm">Send your first message below</p>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <motion.form 
                    onSubmit={handleSendCommunity}
                    className="p-6 border-t border-gray-200/50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex gap-3">
                      <input
                        value={communityDraft}
                        onChange={(e) => setCommunityDraft(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={!communityDraft.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                        type="submit"
                      >
                        <FiSend size={16} />
                        Send
                      </motion.button>
                    </div>
                  </motion.form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <FiMessageSquare size={64} className="mx-auto mb-4 opacity-30" />
                    <h3 className="text-xl font-medium mb-2">Select a community</h3>
                    <p>Choose a community from the sidebar to begin</p>
                  </div>
                </div>
              ))
            ) : activeChatId ? (
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

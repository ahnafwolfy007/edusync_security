import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, doc, setDoc, getDocs } from 'firebase/firestore';
import { getDb } from '../firebase';
import { useAuth } from './AuthContext';

// Firestore data model (proposed):
// chats: { id, participants: [userId...], createdAt, updatedAt, lastMessage, lastSender }
// chatMessages: { id, chatId, senderId, content, createdAt }
// userChatIndex: per-user subcollection referencing chat meta for quick listing (optional future)

const ChatContext = createContext();
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [db, setDb] = useState(null);
  const [dbError, setDbError] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [sending, setSending] = useState(false);

  // Initialize Firebase DB
  useEffect(() => {
    try {
      const database = getDb();
      setDb(database);
    } catch (error) {
      console.error('Failed to initialize Firebase in ChatContext:', error);
      setDbError(error);
    }
  }, []);

  // Subscribe to chats (basic: fetch chats where participants contains userId)
  useEffect(() => {
    if (!user?.user_id && !user?.userId) {
      setChats([]);
      return;
    }
    if (!db) return;
    if (dbError) return;
    
    const uid = user.user_id || user.userId;
    setLoadingChats(true);
    
    try {
      const qChats = query(
        collection(db, 'chats'), 
        where('participants', 'array-contains', String(uid)), 
        orderBy('updatedAt', 'desc')
      );
      const unsub = onSnapshot(qChats, 
        (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setChats(data);
          setLoadingChats(false);
        },
        (error) => {
          console.error('Error loading chats:', error);
          setLoadingChats(false);
        }
      );
      return () => unsub();
    } catch (error) {
      console.error('Error setting up chat subscription:', error);
      setLoadingChats(false);
    }
  }, [user?.user_id, user?.userId, db, dbError]);

  // Subscribe to messages for active chat
  useEffect(() => {
    if (!activeChatId || !db) { setMessages([]); return; }
    
    try {
      const qMsgs = query(collection(db, 'chats', activeChatId, 'messages'), orderBy('createdAt', 'asc'));
      const unsub = onSnapshot(qMsgs, 
        (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setMessages(data);
        },
        (error) => {
          console.error('Error loading messages:', error);
        }
      );
      return () => unsub();
    } catch (error) {
      console.error('Error setting up message subscription:', error);
    }
  }, [activeChatId, db]);

  const startChat = useCallback(async (otherUserId, sellerType = 'business', chatContext = null) => {
    if (!user) {
      console.error('No user found for chat creation');
      return null;
    }
    
    if (!db) {
      console.error('Database not initialized');
      throw new Error('Database not available');
    }
    
    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Database connection failed');
    }
    
    const uid = String(user.user_id || user.userId);
    const otherUserIdStr = String(otherUserId);
    
    try {
      // Check if chat already exists between these users for this specific context
      let existingChatQuery;
      if (chatContext?.itemId) {
        // Look for chats about specific item
        existingChatQuery = query(
          collection(db, 'chats'), 
          where('participants', 'array-contains', uid),
          where('itemId', '==', chatContext.itemId)
        );
      } else {
        // Look for general chats between users
        existingChatQuery = query(
          collection(db, 'chats'), 
          where('participants', 'array-contains', uid)
        );
      }
      
      try {
        const existingChats = await getDocs(existingChatQuery);
        
        // Filter manually for the exact participant match
        const matchingChat = existingChats.docs.find(doc => {
          const data = doc.data();
          const participants = data.participants || [];
          return participants.includes(uid) && participants.includes(otherUserIdStr);
        });
        
        if (matchingChat) {
          setActiveChatId(matchingChat.id);
          return matchingChat.id;
        }
      } catch (queryError) {
        console.error('Error checking for existing chat:', queryError);
      }
      
      // Create new chat with enhanced context
      const chatData = {
        participants: [uid, otherUserIdStr],
        sellerType: sellerType,
        sellerName: chatContext?.sellerName || otherUserIdStr,
        itemId: chatContext?.itemId || null,
        itemName: chatContext?.itemName || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: null,
        lastSender: null
      };

      const newChatRef = await addDoc(collection(db, 'chats'), chatData);
      
      setActiveChatId(newChatRef.id);
      return newChatRef.id;
    } catch (error) {
      console.error('Error in startChat:', error);
      throw error; // Re-throw to be caught by the caller
    }
  }, [user?.user_id, user?.userId, db, dbError]);

  const sendMessage = useCallback(async (content) => {
    if (!user || !activeChatId || !content?.trim()) return;
    
    setSending(true);
    
    try {
      const uid = String(user.user_id || user.userId);
      
      // Create a local message immediately for better UX
      const localMessage = {
        id: `local_${Date.now()}`,
        senderId: uid,
        content: content.trim(),
        createdAt: { seconds: Date.now() / 1000 },
        isLocal: true
      };
      
      // Add to local messages immediately
      setMessages(prev => [...prev, localMessage]);
      
      // Try backend first (more reliable)
      try {
        const response = await fetch('/api/chat/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            chatId: activeChatId,
            content: content.trim()
          })
        });
        
        if (response.ok) {
          // Backend successful, remove local message
          setMessages(prev => prev.filter(m => m.id !== localMessage.id));
          console.log('Message sent via backend');
        } else {
          // Backend failed, try Firebase
          throw new Error('Backend failed');
        }
      } catch (backendError) {
        console.warn('Backend failed, trying Firebase:', backendError);
        
        // Try Firebase as fallback
        if (db) {
          try {
            await Promise.race([
              addDoc(collection(db, 'chats', activeChatId, 'messages'), {
                senderId: uid,
                content: content.trim(),
                createdAt: serverTimestamp()
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), 3000))
            ]);
            
            // Firebase successful, remove local message
            setMessages(prev => prev.filter(m => m.id !== localMessage.id));
            console.log('Message sent via Firebase');
          } catch (firebaseError) {
            console.warn('Firebase also failed, keeping local message:', firebaseError);
            // Keep the local message if both fail
          }
        } else {
          console.warn('No database available, keeping local message');
        }
      }
      
    } catch (error) {
      console.error('Error in sendMessage:', error);
    } finally {
      // Always reset sending state
      setSending(false);
    }
  }, [user?.user_id, user?.userId, activeChatId, db]);

  const value = {
    chats,
    activeChatId,
    setActiveChatId,
    messages,
    loadingChats,
    sending,
    startChat,
    sendMessage
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

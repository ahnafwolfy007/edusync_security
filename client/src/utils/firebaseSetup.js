import { getDb } from '../firebase';
import { collection, doc, setDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';

export const initializeFirestore = async () => {
  try {
    const db = getDb();
    console.log('📱 Initializing Firestore...');

    // Test connection by creating a test document
    const testDoc = await addDoc(collection(db, 'test'), {
      message: 'Firestore initialization test',
      timestamp: serverTimestamp(),
      created: new Date().toISOString()
    });
    
    console.log('✅ Firestore test document created:', testDoc.id);
    
    // Initialize collections with proper structure
    await Promise.all([
      // Create chats collection structure
      setDoc(doc(db, 'chats', 'example'), {
        participants: ['user1', 'user2'],
        sellerType: 'secondhand',
        sellerName: 'Example Seller',
        itemId: null,
        itemName: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: 'Hello!',
        lastSender: 'user1'
      }),
      
      // Create a sample message
      setDoc(doc(db, 'chats', 'example', 'messages', 'msg1'), {
        senderId: 'user1',
        content: 'Hello! This is a test message.',
        createdAt: serverTimestamp()
      })
    ]);
    
    console.log('✅ Firestore collections initialized successfully');
    
    // Test reading data
    const chatsSnapshot = await getDocs(collection(db, 'chats'));
    console.log('📊 Chats collection size:', chatsSnapshot.size);
    
    return {
      success: true,
      message: 'Firestore initialized successfully',
      collections: chatsSnapshot.size
    };
    
  } catch (error) {
    console.error('❌ Firestore initialization failed:', error);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

export const testFirestoreRules = async () => {
  try {
    const db = getDb();
    
    // Test write permission
    const testWrite = await addDoc(collection(db, 'test-rules'), {
      message: 'Testing write permissions',
      timestamp: serverTimestamp()
    });
    
    console.log('✅ Write test successful:', testWrite.id);
    
    // Test read permission
    const testRead = await getDocs(collection(db, 'test-rules'));
    console.log('✅ Read test successful, docs:', testRead.size);
    
    return { success: true, message: 'Firestore rules are properly configured' };
    
  } catch (error) {
    console.error('❌ Firestore rules test failed:', error);
    
    if (error.code === 'permission-denied') {
      return {
        success: false,
        error: 'Permission denied - Firestore rules need to be updated',
        solution: 'Set Firestore rules to allow read/write in test mode'
      };
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

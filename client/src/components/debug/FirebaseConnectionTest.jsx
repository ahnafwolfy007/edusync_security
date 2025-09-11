import { getDb, requestNotificationPermission, getFCMToken } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Simple Firebase test component to verify connection
const FirebaseConnectionTest = () => {
  const testConnection = async () => {
    try {
      console.log('Testing Firebase connection...');
      const db = getDb();
      console.log('Database initialized:', !!db);
      
      // Try to write a test document
      const testDoc = await addDoc(collection(db, 'test'), {
        message: 'Connection test',
        timestamp: serverTimestamp()
      });
      
      console.log('Test document created:', testDoc.id);
      console.log('Firestore is working properly!');
    } catch (error) {
      console.error('Firestore connection test failed:', error);
    }
  };

  const testFCM = async () => {
    try {
      console.log('Testing FCM...');
      const token = await requestNotificationPermission();
      if (token) {
        console.log('FCM is working! Token:', token);
        
        // Test sending token to backend
        const response = await fetch('/api/notifications/register-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ fcmToken: token })
        });
        
        if (response.ok) {
          console.log('FCM token successfully registered with backend');
        } else {
          console.error('Failed to register FCM token with backend');
        }
      } else {
        console.log('FCM permission denied or failed');
      }
    } catch (error) {
      console.error('FCM test failed:', error);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      padding: '15px',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Firebase Tests</h4>
      <button 
        onClick={testConnection}
        style={{
          padding: '8px 12px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Test Firestore
      </button>
      <button 
        onClick={testFCM}
        style={{
          padding: '8px 12px',
          backgroundColor: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        Test FCM
      </button>
    </div>
  );
};

export default FirebaseConnectionTest;

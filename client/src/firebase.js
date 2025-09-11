// Firebase initialization (frontend only). Ensure environment variables are set.
// Provide placeholders; real values should be in .env (VITE_ prefixed for Vite)
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate Firebase configuration
const validateConfig = () => {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
  
  if (missingKeys.length > 0) {
    console.error('Missing Firebase configuration keys:', missingKeys);
    return false;
  }
  
  console.log('Firebase configuration validated successfully');
  return true;
};

let app;
let messaging;

export const getFirebaseApp = () => {
  if (!app) {
    if (!validateConfig()) {
      throw new Error('Firebase configuration is incomplete');
    }
    app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized successfully');
  }
  return app;
};

export const getDb = () => {
  try {
    return getFirestore(getFirebaseApp());
  } catch (error) {
    console.error('Firestore initialization failed:', error);
    throw error;
  }
};

export const getFirebaseAuth = () => {
  try {
    return getAuth(getFirebaseApp());
  } catch (error) {
    console.error('Firebase Auth initialization failed:', error);
    throw error;
  }
};

// Firebase Cloud Messaging
export const getFirebaseMessaging = () => {
  if (!messaging) {
    try {
      messaging = getMessaging(getFirebaseApp());
      console.log('Firebase Messaging initialized successfully');
    } catch (error) {
      console.error('Firebase Messaging initialization failed:', error);
      throw error;
    }
  }
  return messaging;
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted');
      return await getFCMToken();
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

// Get FCM registration token
export const getFCMToken = async () => {
  try {
    const messaging = getFirebaseMessaging();
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY // You'll need to add this to .env
    });
    
    if (token) {
      console.log('FCM Token received:', token);
      return token;
    } else {
      console.log('No registration token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback) => {
  try {
    const messaging = getFirebaseMessaging();
    return onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      callback(payload);
    });
  } catch (error) {
    console.error('Error setting up foreground message listener:', error);
  }
};

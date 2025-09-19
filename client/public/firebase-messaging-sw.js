// Firebase Cloud Messaging Service Worker
// This file must be placed in the public directory

import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

const firebaseConfig = {
  apiKey: "AIzaSyCHlzJ2m45pPP0thFbh0NshPjCfSNcAB4I",
  authDomain: "edusync-bfcaf.firebaseapp.com",
  projectId: "edusync-bfcaf",
  storageBucket: "edusync-bfcaf.firebasestorage.app",
  messagingSenderId: "31079598244",
  appId: "1:31079598244:web:dc2f016e14b428e3663e31"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Handle background messages
onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'EduSync Notification';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new notification',
  icon: '/edusync%20site%20images/logo%201.png',
    badge: '/badge-icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

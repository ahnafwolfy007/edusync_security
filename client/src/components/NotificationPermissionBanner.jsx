import React from 'react';
import { motion } from 'framer-motion';
import { FiBell, FiBellOff, FiCheck } from 'react-icons/fi';
import { useNotification } from '../context/NotificationContext';

const NotificationPermissionBanner = () => {
  const { fcmPermission, requestFCMPermission, fcmToken } = useNotification();

  // Don't show if permission is already granted or if it's denied
  if (fcmPermission === 'granted' || fcmPermission === 'denied') {
    return null;
  }

  const handleEnableNotifications = async () => {
    await requestFCMPermission();
  };

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FiBell className="text-xl" />
          <div>
            <p className="font-medium">Stay connected with EduSync!</p>
            <p className="text-sm text-blue-100">
              Enable notifications to get instant updates about new messages, orders, and marketplace activities.
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleEnableNotifications}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center space-x-2"
          >
            <FiBell size={16} />
            <span>Enable Notifications</span>
          </motion.button>
          
          <button
            onClick={() => {/* Handle dismiss */}}
            className="text-blue-100 hover:text-white transition-colors p-1"
          >
            <FiBellOff size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Notification status indicator component
export const NotificationStatus = () => {
  const { fcmPermission, fcmToken, requestFCMPermission } = useNotification();

  const getStatusInfo = () => {
    switch (fcmPermission) {
      case 'granted':
        return {
          icon: FiCheck,
          text: 'Notifications enabled',
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      case 'denied':
        return {
          icon: FiBellOff,
          text: 'Notifications disabled',
          color: 'text-red-600',
          bgColor: 'bg-red-50'
        };
      default:
        return {
          icon: FiBell,
          text: 'Enable notifications',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
    }
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  return (
    <div className={`${status.bgColor} ${status.color} px-3 py-2 rounded-lg flex items-center space-x-2 text-sm`}>
      <Icon size={16} />
      <span>{status.text}</span>
      {fcmPermission !== 'granted' && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={requestFCMPermission}
          className="ml-2 text-xs bg-white px-2 py-1 rounded font-medium hover:bg-gray-50"
        >
          Enable
        </motion.button>
      )}
    </div>
  );
};

export default NotificationPermissionBanner;

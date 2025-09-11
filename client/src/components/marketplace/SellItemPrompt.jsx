import React from 'react';
import { motion } from 'framer-motion';
import { 
  FiCamera, 
  FiDollarSign, 
  FiTag, 
  FiCheck, 
  FiUpload,
  FiTrendingUp,
  FiUsers,
  FiShield
} from 'react-icons/fi';

const SellItemPrompt = ({ onStartSelling }) => {
  const benefits = [
    {
      icon: FiDollarSign,
      title: 'Earn Money',
      description: 'Turn your unused items into cash quickly and easily',
      color: 'text-green-500'
    },
    {
      icon: FiUsers,
      title: 'Campus Community',
      description: 'Sell directly to fellow students who understand your needs',
      color: 'text-blue-500'
    },
    {
      icon: FiShield,
      title: 'Safe & Secure',
      description: 'Built-in wallet system with secure transactions',
      color: 'text-purple-500'
    },
    {
      icon: FiTrendingUp,
      title: 'Quick Sales',
      description: 'Items typically sell faster within the campus community',
      color: 'text-orange-500'
    }
  ];

  const steps = [
    {
      icon: FiCamera,
      title: 'Add Photos',
      description: 'Upload up to 5 high-quality images'
    },
    {
      icon: FiTag,
      title: 'Set Details',
      description: 'Add title, description, and category'
    },
    {
      icon: FiDollarSign,
      title: 'Price It Right',
      description: 'Set a competitive price for quick sale'
    },
    {
      icon: FiCheck,
      title: 'Post & Earn',
      description: 'Your item goes live instantly'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-4">
          <FiUpload className="text-white" size={24} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Selling Your Items</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Join thousands of students who are already earning money by selling items on our platform
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {benefits.map((benefit, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-start space-x-3">
              <benefit.icon className={`mt-1 ${benefit.color}`} size={20} />
              <div>
                <h3 className="font-medium text-gray-900 mb-1">{benefit.title}</h3>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* How it Works */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">How It Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                <step.icon className="text-blue-600" size={18} />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">{step.title}</h4>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      <div className="text-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStartSelling}
          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <FiUpload className="mr-2" size={20} />
          Sell Your First Item
        </motion.button>
        <p className="text-sm text-gray-500 mt-3">
          Free to list • No hidden fees • Instant payments
        </p>
      </div>
    </motion.div>
  );
};

export default SellItemPrompt;

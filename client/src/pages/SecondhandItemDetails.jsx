import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMapPin, FiClock, FiMessageCircle } from 'react-icons/fi';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

const SecondhandItemDetails = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchItem(); }, [itemId]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/secondhand/${itemId}`);
      const payload = res.data?.data || res.data;
      setItem(payload);
    } catch (e) {
      showNotification('Error loading item', 'error');
    } finally { setLoading(false); }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!item) return (
    <div className="p-6 text-center">
      <p className="mb-4">Item not found.</p>
      <button className="btn" onClick={() => navigate('/secondhand-market')}>Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        <button onClick={() => navigate('/secondhand-market')} className="flex items-center text-sm text-gray-600 mb-4">
          <FiArrowLeft className="mr-2"/> Back
        </button>
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-2">{item.title}</h1>
          <div className="text-gray-500 text-sm flex items-center space-x-4 mb-4">
            <span className="flex items-center"><FiMapPin className="mr-1" />{item.location || 'Location N/A'}</span>
            <span className="flex items-center"><FiClock className="mr-1" />{item.timeAgo}</span>
            <span className="flex items-center"><FiMessageCircle className="mr-1" />{item.inquiries || 0} inquiries</span>
          </div>
          <p className="text-gray-700 mb-4">{item.description}</p>
          <div className="text-xl font-semibold text-blue-600 mb-6">৳{item.price}</div>
          <button className="btn btn-primary" onClick={() => navigate(`/chat/${item.seller?.id}`)}>Chat with Seller</button>
        </div>
      </div>
    </div>
  );
};

export default SecondhandItemDetails;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMapPin, FiCalendar } from 'react-icons/fi';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

const FreeItemDetails = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchItem(); }, [itemId]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/free-marketplace/items/${itemId}`);
      const payload = res.data?.data || res.data;
      setItem({
        id: payload.item_id,
        title: payload.item_name,
        description: payload.description,
        location: payload.pickup_location,
        posted_at: payload.posted_at,
        giver_name: payload.giver_name,
        contact_info: payload.contact_info,
        condition_note: payload.condition_note
      });
    } catch (e) {
      showNotification('Error loading item', 'error');
    } finally { setLoading(false); }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!item) return (
    <div className="p-6 text-center">
      <p className="mb-4">Item not found.</p>
      <button className="btn" onClick={() => navigate('/free-marketplace')}>Back</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-4">
        <button onClick={() => navigate('/free-marketplace')} className="flex items-center text-sm text-gray-600 mb-4">
          <FiArrowLeft className="mr-2"/> Back
        </button>
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-2">{item.title}</h1>
          <div className="text-gray-500 text-sm flex items-center space-x-4 mb-4">
            <span className="flex items-center"><FiMapPin className="mr-1" />{item.location}</span>
            <span className="flex items-center"><FiCalendar className="mr-1" />{new Date(item.posted_at).toLocaleDateString()}</span>
          </div>
          <p className="text-gray-700 mb-4">{item.description}</p>
          {item.condition_note && <p className="text-sm text-gray-600 mb-2">Condition: {item.condition_note}</p>}
          <div className="p-4 bg-gray-50 rounded mb-4 text-sm">
            <p><strong>Giver:</strong> {item.giver_name}</p>
            <p><strong>Contact:</strong> {item.contact_info}</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/free-marketplace')}>Request Item</button>
        </div>
      </div>
    </div>
  );
};

export default FreeItemDetails;

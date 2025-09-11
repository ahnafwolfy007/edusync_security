import React from 'react';
import { useParams } from 'react-router-dom';

const BusinessOrders = () => {
  const { businessId } = useParams();
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Business Orders (Business #{businessId})</h1>
      <p className="text-gray-600 mb-4">Orders list UI coming soon.</p>
    </div>
  );
};

export default BusinessOrders;

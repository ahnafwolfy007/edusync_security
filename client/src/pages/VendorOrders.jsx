import React from 'react';
import { useParams } from 'react-router-dom';

const VendorOrders = () => {
  const { vendorId } = useParams();
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Vendor Orders (Vendor #{vendorId})</h1>
      <p className="text-gray-600 mb-4">Orders list UI coming soon.</p>
    </div>
  );
};

export default VendorOrders;

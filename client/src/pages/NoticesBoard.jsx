import React from 'react';

const NoticesBoard = () => {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Campus Notices</h1>
      <p className="text-gray-600 mb-6">Moderators and admins can create/update pinned notices. Display feed here.</p>
      <div className="card p-4 mb-4">Notice creation/editing UI placeholder.</div>
      <div className="space-y-4">{/* notices list */}</div>
    </div>
  );
};

export default NoticesBoard;

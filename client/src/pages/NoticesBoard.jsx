import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const NoticesBoard = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get('/notices');
        if (mounted && data?.success) setNotices(data.data || []);
      } catch (e) {
        console.warn('Failed to load notices');
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Campus Notices</h1>
      <p className="text-gray-600 mb-6">Official and community updates. Click a notice to read the full content.</p>
      {loading ? (
        <div className="spinner w-8 h-8" />
      ) : (
        <div className="space-y-4">
          {notices.map(n => (
            <Link key={n.notice_id} to={`/notices/${n.slug || n.notice_id}`} className="block enhanced-card p-4 hover-lift">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{n.title || 'Untitled notice'}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">{n.excerpt || n.content?.slice(0, 150)}</p>
                  {n.source_url && <p className="text-xs text-gray-400 mt-1">Source: {new URL(n.source_url).hostname}</p>}
                </div>
                <div className="text-right text-sm text-gray-500 min-w-[140px]">
                  <div>{n.published_at ? new Date(n.published_at).toLocaleString() : new Date(n.created_at).toLocaleString()}</div>
                  {n.is_pinned && <span className="inline-block mt-1 px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs">Pinned</span>}
                </div>
              </div>
            </Link>
          ))}
          {notices.length === 0 && (
            <div className="text-gray-500">No notices yet.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default NoticesBoard;

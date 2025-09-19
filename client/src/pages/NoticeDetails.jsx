import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function NoticeDetails() {
  const { id } = useParams();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get(`/notices/${encodeURIComponent(id)}`);
        if (mounted && data?.success) setNotice(data.data);
      } catch (e) {
        // ignore
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="p-6"><div className="spinner w-8 h-8" /></div>;
  if (!notice) return <div className="p-6 text-gray-500">Notice not found.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900">{notice.title}</h1>
      <div className="text-sm text-gray-500 mt-1">
        {notice.published_at ? new Date(notice.published_at).toLocaleString() : new Date(notice.created_at).toLocaleString()}
        {notice.source_url && (
          <>
            {' • '}Source: <a href={notice.source_url} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">{new URL(notice.source_url).hostname}</a>
          </>
        )}
      </div>
      <div className="enhanced-card p-5 mt-4 text-gray-800 prose prose-sm max-w-none">
        {notice.content ? (
          <div
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(notice.content)) }}
          />
        ) : (
          <p className="whitespace-pre-wrap">{notice.excerpt}</p>
        )}
      </div>
    </div>
  );
}

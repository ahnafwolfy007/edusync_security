import React, { useEffect, useState } from 'react';
import { businessService } from '../services/businessService';
import { useAuth } from '../context/AuthContext';
import { FiCheckCircle, FiClock, FiXCircle, FiRefreshCcw } from 'react-icons/fi';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
};

const BusinessApply = () => {
  const { user, syncProfile } = useAuth();
  const [application, setApplication] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ businessName: '', businessType: '', licenseInfo: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await businessService.getApplicationStatus();
      if (status) setApplication(status);
      const hist = await businessService.fetchApplicationHistory();
      setHistory(hist);
    } catch (e) {
      // 404 means no application yet
      if (e?.response?.status !== 404) setError('Failed to load application data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const app = await businessService.submitApplication(form);
      setApplication(app);
      // Refresh history
      const hist = await businessService.fetchApplicationHistory();
      setHistory(hist);
    } catch (err) {
      setError(err?.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const refreshStatus = async () => {
    setLoading(true);
    try {
      const status = await businessService.getApplicationStatus();
      if (status?.status === 'approved') {
        await syncProfile();
      }
      setApplication(status);
      const hist = await businessService.fetchApplicationHistory();
      setHistory(hist);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Business Application</h1>
          <p className="text-gray-600 text-sm">Apply to become a verified campus business. After approval you can create your shop and add products.</p>
        </div>
        <button onClick={refreshStatus} className="btn btn-sm btn-outline flex items-center"><FiRefreshCcw className="w-4 h-4 mr-1" />Refresh</button>
      </div>
      {loading && <div className="animate-pulse text-gray-500">Loading...</div>}
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {!loading && (
        <>
          {application ? (
            <div className="mb-6 p-4 border rounded bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {application.status === 'approved' && <FiCheckCircle className="w-5 h-5 text-green-600" />}
                  {application.status === 'pending' && <FiClock className="w-5 h-5 text-yellow-600" />}
                  {application.status === 'rejected' && <FiXCircle className="w-5 h-5 text-red-600" />}
                  <h2 className="font-semibold">Current Application</h2>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[application.status] || 'bg-gray-200 text-gray-700'}`}>{application.status.toUpperCase()}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                <div><span className="font-medium">Business Name:</span> {application.business_name}</div>
                <div><span className="font-medium">Type:</span> {application.business_type}</div>
                <div><span className="font-medium">Applied:</span> {new Date(application.applied_at).toLocaleString()}</div>
                {application.reviewed_at && <div><span className="font-medium">Reviewed:</span> {new Date(application.reviewed_at).toLocaleString()}</div>}
                {application.review_comments && <div className="md:col-span-2"><span className="font-medium">Reviewer Notes:</span> {application.review_comments}</div>}
              </div>
              {application.status === 'approved' && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  Approved! Go to the <a href="/dashboard/business-owner" className="underline font-medium">Business Owner Dashboard</a> to create your shop.
                </div>
              )}
              {application.status === 'rejected' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  Your application was rejected. You may submit a new one below.
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 p-4 border rounded bg-blue-50 text-blue-800 text-sm">
              No application found. Submit the form below to apply.
            </div>
          )}

          {/* Re-apply form if no application or rejected */}
          {(!application || application.status === 'rejected') && (
            <form onSubmit={submit} className="space-y-4 mb-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="form-label text-sm font-medium">Business Name</label>
                  <input required disabled={submitting} value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})} className="form-input w-full" placeholder="e.g. Campus Tech Hub" />
                </div>
                <div>
                  <label className="form-label text-sm font-medium">Business Type</label>
                  <input required disabled={submitting} value={form.businessType} onChange={e=>setForm({...form,businessType:e.target.value})} className="form-input w-full" placeholder="e.g. electronics" />
                </div>
                <div className="md:col-span-3">
                  <label className="form-label text-sm font-medium">License / Info (optional)</label>
                  <input disabled={submitting} value={form.licenseInfo} onChange={e=>setForm({...form,licenseInfo:e.target.value})} className="form-input w-full" placeholder="Registration / permit reference" />
                </div>
              </div>
              <button disabled={submitting} className="btn btn-primary btn-sm">{submitting ? 'Submitting...' : 'Submit Application'}</button>
            </form>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-3">Application History</h2>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No previous applications.</p>
            ) : (
              <div className="border rounded divide-y bg-white">
                {history.map(h => (
                  <div key={h.application_id} className="p-3 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="font-medium">{h.business_name} <span className={`ml-2 px-2 py-0.5 rounded text-[10px] ${statusColors[h.status] || 'bg-gray-200 text-gray-700'}`}>{h.status.toUpperCase()}</span></div>
                      <div className="text-[11px] text-gray-500">Applied {new Date(h.applied_at).toLocaleString()} {h.reviewed_at && `• Reviewed ${new Date(h.reviewed_at).toLocaleString()}`}</div>
                      {h.review_comments && <div className="text-[11px] text-gray-600">Notes: {h.review_comments}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BusinessApply;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { businessService } from '../services/businessService';
import BusinessRevenueChart from '../components/business/BusinessRevenueChart';

const Metric = ({ label, value }) => (
  <div className="p-4 rounded bg-gray-50 border">
    <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
    <div className="text-xl font-semibold mt-1">{value ?? '—'}</div>
  </div>
);

const BusinessOwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [application, setApplication] = useState(null);
  const [history, setHistory] = useState([]);
  const [appForm, setAppForm] = useState({ businessName:'', businessType:'', licenseInfo:'' });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const primaryBusiness = businesses[0];

  const load = async () => {
    setLoading(true);
    try {
      const list = await businessService.fetchMyBusinesses();
      setBusinesses(list);
      if (list?.length) {
        const a = await businessService.fetchBusinessAnalytics(list[0].business_id || list[0].id);
        setAnalytics(a?.analytics || a);
      } else {
        setAnalytics(null);
  const status = await businessService.getApplicationStatus();
  setApplication(status);
  const hist = await businessService.fetchApplicationHistory();
  setHistory(hist);
      }
    } catch (e) {
      console.error('Load business dashboard error', e);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => load();

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Business Owner Dashboard</h1>
        <div>
          <button onClick={refresh} disabled={loading} className="btn btn-sm mr-2">{loading ? 'Refreshing...' : 'Refresh'}</button>
          <button onClick={()=>navigate('/business/apply')} className="btn btn-primary btn-sm">{primaryBusiness ? 'Manage / Add New' : 'Apply'}</button>
        </div>
      </div>
      {!loading && !primaryBusiness && (
        <div className="p-4 rounded border bg-yellow-50 text-sm text-yellow-800 mb-6 space-y-4">
          <div>
            <p className="font-medium">You have no approved business yet.</p>
            {!application && <p className="text-xs">Submit an application to get started.</p>}
            {application && (
              <div className="mt-2 text-xs">
                <span className="font-semibold">Application Status:</span> {application.status}
                <div className="text-gray-600">Submitted: {new Date(application.applied_at).toLocaleString()}</div>
              </div>
            )}
            {history.length>1 && (
              <div className="mt-3 bg-white/50 border rounded p-2 text-[11px] space-y-1 max-h-40 overflow-y-auto">
                <div className="font-semibold">History</div>
                {history.map(h=> <div key={h.application_id} className="flex justify-between"><span>{h.business_name}</span><span>{h.status}</span></div>)}
              </div>
            )}
          </div>
          {!application && (
            <form onSubmit={async e=>{e.preventDefault(); setSubmitting(true); try { const app = await businessService.submitApplication({ businessName: appForm.businessName, businessType: appForm.businessType, licenseInfo: appForm.licenseInfo }); setApplication(app); } catch(err){ console.error(err);} finally { setSubmitting(false);} }} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input required disabled={submitting} value={appForm.businessName} onChange={e=>setAppForm({...appForm,businessName:e.target.value})} placeholder="Business Name" className="form-input" />
                <input required disabled={submitting} value={appForm.businessType} onChange={e=>setAppForm({...appForm,businessType:e.target.value})} placeholder="Business Type" className="form-input" />
                <input disabled={submitting} value={appForm.licenseInfo} onChange={e=>setAppForm({...appForm,licenseInfo:e.target.value})} placeholder="License Info (optional)" className="form-input" />
              </div>
              <button disabled={submitting} className="btn btn-primary btn-sm">{submitting? 'Submitting...' : 'Submit Application'}</button>
            </form>
          )}
        </div>
      )}
      {loading && <div className="animate-pulse text-gray-500 mb-4">Loading businesses...</div>}
      {primaryBusiness && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Metric label="Products" value={analytics?.active_products} />
            <Metric label="Orders" value={analytics?.total_orders} />
            <Metric label="Completed" value={analytics?.completed_orders} />
            <Metric label="Revenue" value={analytics?.total_revenue} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="card p-4 flex flex-col">
              <h3 className="font-semibold mb-2">Products</h3>
              <p className="text-sm text-gray-500 mb-4">Add or edit your catalog.</p>
              <button onClick={()=>navigate(`/business/${primaryBusiness.business_id || primaryBusiness.id}/products`)} className="btn btn-secondary btn-sm mt-auto">Manage Products</button>
            </div>
            <div className="card p-4 flex flex-col">
              <h3 className="font-semibold mb-2">Orders</h3>
              <p className="text-sm text-gray-500 mb-4">Process incoming customer orders.</p>
              <button onClick={()=>navigate(`/business/${primaryBusiness.business_id || primaryBusiness.id}/orders`)} className="btn btn-outline btn-sm mt-auto">View Orders</button>
            </div>
            <div className="card p-4 flex flex-col">
              <h3 className="font-semibold mb-2">Analytics</h3>
              <p className="text-sm text-gray-500 mb-4">Detailed performance charts.</p>
              <button onClick={()=>refresh()} className="btn btn-light btn-sm mt-auto">Refresh Analytics</button>
            </div>
          </div>
          <BusinessRevenueChart businessId={primaryBusiness.business_id || primaryBusiness.id} days={30} />
        </>
      )}
    </div>
  );
};

export default BusinessOwnerDashboard;

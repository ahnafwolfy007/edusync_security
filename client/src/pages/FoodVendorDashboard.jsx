import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { foodVendorService } from '../services/foodVendorService';
import { useAuth } from '../context/AuthContext';
import VendorRevenueChart from '../components/vendor/VendorRevenueChart';

const Metric = ({ label, value }) => (
  <div className="p-4 rounded bg-gray-50 border">
    <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
    <div className="text-xl font-semibold mt-1">{value ?? '—'}</div>
  </div>
);

const FoodVendorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [application, setApplication] = useState(null);
  const [history, setHistory] = useState([]);
  const [appForm, setAppForm] = useState({ restaurantName:'', cuisine:'', address:'', phone:'', licenseInfo:'' });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const v = await foodVendorService.fetchMyVendor();
      setVendor(v);
      if (v) {
        const a = await foodVendorService.fetchVendorAnalytics(v.vendor_id || v.id);
        setAnalytics(a?.analytics || a);
      } else {
        setAnalytics(null);
  const status = await foodVendorService.getApplicationStatus();
  setApplication(status);
  const hist = await foodVendorService.fetchApplicationHistory();
  setHistory(hist);
      }
    } catch (e) {
      console.error('Load vendor dashboard error', e);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => load();
  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Food Vendor Dashboard</h1>
        <div>
          <button onClick={refresh} disabled={loading} className="btn btn-sm mr-2">{loading ? 'Refreshing...' : 'Refresh'}</button>
          <button onClick={()=>navigate('/food-vendor/apply')} className="btn btn-primary btn-sm">{vendor ? 'Manage / New' : 'Apply'}</button>
        </div>
      </div>
      {!loading && !vendor && (
        <div className="p-4 rounded border bg-blue-50 text-sm text-blue-800 mb-6 space-y-4">
          <div>
            <p className="font-medium">No approved vendor profile yet.</p>
            {!application && <p className="text-xs">Apply to start selling food.</p>}
            {application && (
              <div className="mt-2 text-xs">
                <span className="font-semibold">Application Status:</span> {application.status}
                <div className="text-blue-700">Submitted: {new Date(application.applied_at).toLocaleString()}</div>
              </div>
            )}
            {history.length>1 && (
              <div className="mt-3 bg-white/40 border rounded p-2 text-[11px] space-y-1 max-h-40 overflow-y-auto">
                <div className="font-semibold">History</div>
                {history.map(h=> <div key={h.application_id} className="flex justify-between"><span>{h.restaurant_name}</span><span>{h.status}</span></div>)}
              </div>
            )}
          </div>
          {!application && (
            <form onSubmit={async e=>{e.preventDefault(); setSubmitting(true); try { const app = await foodVendorService.submitApplication({ restaurantName: appForm.restaurantName, cuisine: appForm.cuisine, address: appForm.address, phone: appForm.phone, licenseInfo: appForm.licenseInfo }); setApplication(app);} catch(err){ console.error(err);} finally { setSubmitting(false);} }} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input required disabled={submitting} value={appForm.restaurantName} onChange={e=>setAppForm({...appForm,restaurantName:e.target.value})} placeholder="Restaurant Name" className="form-input" />
                <input required disabled={submitting} value={appForm.cuisine} onChange={e=>setAppForm({...appForm,cuisine:e.target.value})} placeholder="Cuisine" className="form-input" />
                <input required disabled={submitting} value={appForm.address} onChange={e=>setAppForm({...appForm,address:e.target.value})} placeholder="Address" className="form-input" />
                <input required disabled={submitting} value={appForm.phone} onChange={e=>setAppForm({...appForm,phone:e.target.value})} placeholder="Phone" className="form-input" />
                <input disabled={submitting} value={appForm.licenseInfo} onChange={e=>setAppForm({...appForm,licenseInfo:e.target.value})} placeholder="License Info" className="form-input" />
              </div>
              <button disabled={submitting} className="btn btn-primary btn-sm">{submitting? 'Submitting...' : 'Submit Application'}</button>
            </form>
          )}
        </div>
      )}
      {loading && <div className="animate-pulse text-gray-500 mb-4">Loading vendor data...</div>}
      {vendor && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Metric label="Items" value={analytics?.available_items} />
            <Metric label="Orders" value={analytics?.total_orders} />
            <Metric label="Active" value={analytics?.active_orders} />
            <Metric label="Revenue" value={analytics?.total_revenue} />
            <Metric label="Avg Rating" value={analytics?.avg_rating?.toFixed ? analytics.avg_rating.toFixed(1) : analytics?.avg_rating} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="card p-4 flex flex-col">
              <h3 className="font-semibold mb-2">Menu Items</h3>
              <p className="text-sm text-gray-500 mb-4">Add or edit your offerings.</p>
              <button onClick={()=>navigate(`/food-vendor/${vendor.vendor_id || vendor.id}/menu`)} className="btn btn-secondary btn-sm mt-auto">Manage Menu</button>
            </div>
            <div className="card p-4 flex flex-col">
              <h3 className="font-semibold mb-2">Orders</h3>
              <p className="text-sm text-gray-500 mb-4">Monitor incoming orders.</p>
              <button onClick={()=>navigate(`/food-vendor/${vendor.vendor_id || vendor.id}/orders`)} className="btn btn-outline btn-sm mt-auto">View Orders</button>
            </div>
            <div className="card p-4 flex flex-col">
              <h3 className="font-semibold mb-2">Analytics</h3>
              <p className="text-sm text-gray-500 mb-4">Performance insights.</p>
              <button onClick={refresh} className="btn btn-light btn-sm mt-auto">Refresh Analytics</button>
            </div>
          </div>
          <VendorRevenueChart vendorId={vendor.vendor_id || vendor.id} days={30} />
        </>
      )}
    </div>
  );
};

export default FoodVendorDashboard;

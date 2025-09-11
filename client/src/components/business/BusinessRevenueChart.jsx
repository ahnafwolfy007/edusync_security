import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import api from '../../api';
ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function BusinessRevenueChart({ businessId, days=30 }) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cumulative, setCumulative] = useState(false);
  useEffect(()=>{ if(!businessId) return; (async()=>{ setLoading(true); setError(null); try { const res = await api.get(`/admin/analytics/business/${businessId}/revenue-series?days=${days}`); setSeries(res.data?.data?.series||[]); } catch(e){ setError(e.message);} finally { setLoading(false);} })(); },[businessId,days]);
  if(!businessId) return <div className='text-sm text-gray-500'>Select a business.</div>;
  if(loading) return <div className='text-sm text-gray-500'>Loading revenue...</div>;
  if(error) return <div className='text-sm text-red-600'>Error: {error}</div>;
  const labels = series.map(r=> new Date(r.day).toLocaleDateString());
  // Optionally transform to cumulative
  const rev = []; const ord = [];
  let accR=0, accO=0;
  series.forEach(r=>{ const rv = parseFloat(r.revenue)||0; const od = parseInt(r.orders)||0; if(cumulative){ accR+=rv; accO+=od; rev.push(accR); ord.push(accO);} else { rev.push(rv); ord.push(od);} });
  const data = { labels, datasets:[ { label:cumulative? 'Revenue (Cumulative)':'Revenue', data: rev, borderColor:'#2563eb', backgroundColor:'#2563eb', tension:.3 }, { label:cumulative? 'Orders (Cumulative)':'Orders', data: ord, borderColor:'#f59e0b', backgroundColor:'#f59e0b', yAxisID:'y1', tension:.3 } ] };
  const options = { responsive:true, interaction:{ mode:'index', intersect:false }, scales:{ y:{ beginAtZero:true, ticks:{ precision:0 }}, y1:{ position:'right', grid:{ drawOnChartArea:false }, beginAtZero:true, ticks:{ precision:0 }}}};
  return <div className='card p-4'>
    <div className='flex items-center justify-between mb-3'>
      <h4 className='font-semibold'>Business Revenue (last {days} days)</h4>
      <button onClick={()=>setCumulative(c=>!c)} className='text-xs px-2 py-1 rounded border'>{cumulative? 'View Daily':'View Cumulative'}</button>
    </div>
    <Line data={data} options={options} height={120}/>
  </div>;
}

import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';
import api from '../../api';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const palette = {
  users: '#2563eb',
  logins: '#9333ea',
  payments: '#059669',
  businessOrders: '#ea580c',
  foodOrders: '#dc2626'
};

export default function AnalyticsOverview({ days = 14 }) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/admin/analytics/time-series?days=${days}`);
        setSeries(res.data?.data?.series || []);
      } catch (e) {
        setError(e.message);
      } finally { setLoading(false); }
    })();
  }, [days]);

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading analytics...</div>;
  if (error) return <div className="p-4 text-sm text-red-600">Failed: {error}</div>;
  if (!series.length) return <div className="p-4 text-sm text-gray-500">No data.</div>;

  const labels = series.map(r => new Date(r.day).toLocaleDateString());
  const data = {
    labels,
    datasets: [
      { label: 'New Users', data: series.map(r=>r.new_users), borderColor: palette.users, backgroundColor: palette.users, tension: .3 },
      { label: 'Logins', data: series.map(r=>r.logins), borderColor: palette.logins, backgroundColor: palette.logins, tension: .3 },
      { label: 'Payments', data: series.map(r=>r.payments), borderColor: palette.payments, backgroundColor: palette.payments, tension: .3 },
      { label: 'Business Orders', data: series.map(r=>r.business_orders), borderColor: palette.businessOrders, backgroundColor: palette.businessOrders, tension: .3 },
      { label: 'Food Orders', data: series.map(r=>r.food_orders), borderColor: palette.foodOrders, backgroundColor: palette.foodOrders, tension: .3 }
    ]
  };

  const options = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
    interaction: { mode: 'index', intersect: false },
    scales: { y: { beginAtZero: true, ticks: { precision:0 } } }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900">Platform Activity (last {days} days)</h4>
      </div>
      <Line data={data} options={options} height={120} />
    </div>
  );
}

import React from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#2563eb', '#7c3aed', '#ec4899', '#ea580c', '#16a34a'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'white', padding: '0.625rem 0.875rem', borderRadius: '8px',
      boxShadow: '0 4px 12px rgb(0 0 0 / 0.12)', border: 'none',
      fontSize: '0.8125rem'
    }}>
      <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#0f172a' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: '0.5rem' }}>
          <span>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>
            {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────
// KPI CARDS
// ─────────────────────────────────────────────────────
export const KPICards = ({ data }) => {
  if (!data || Object.keys(data).length === 0) return null;

  const cards = [
    { label: 'Revenue Today',      value: `$${(data.revenue_today || 0).toLocaleString()}`, trend: data.revenue_trend_pct, icon: '💰' },
    { label: 'Orders Today',       value: (data.orders_today || 0).toLocaleString(), trend: null, icon: '🛍️' },
    { label: 'Avg Order Value',    value: `$${(data.avg_order_value || 0).toFixed(2)}`, trend: null, icon: '📈' },
    { label: 'Top Product',        value: data.top_product || 'N/A', trend: null, icon: '🏆' },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card, i) => (
        <div key={i} className="kpi-card" id={`kpi-${i}`}>
          <div className="kpi-header">
            <div className="kpi-label">{card.label}</div>
            <div className="kpi-icon">{card.icon}</div>
          </div>
          <div className="kpi-value">{card.value}</div>
          {card.trend !== null && card.trend !== undefined && (
            <span className={`kpi-trend ${card.trend >= 0 ? 'trend-up' : 'trend-down'}`}>
              {card.trend >= 0 ? '↑' : '↓'} {Math.abs(card.trend).toFixed(1)}% vs yesterday
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────
// REVENUE BY HOUR — Area Chart
// ─────────────────────────────────────────────────────
export const RevenueByHourChart = ({ data }) => (
  <div className="chart-container">
    <div className="chart-header">
      <h3 className="chart-title">Revenue by Hour</h3>
      <span className="chart-badge">Today · Real-time</span>
    </div>
    <div style={{ height: 280 }}>
      {data?.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5}
              fill="url(#revenueGradient)" dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#2563eb', stroke: 'white', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="empty-state"><div className="emoji">📊</div>No hourly data for today yet</div>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────
// REVENUE BY DATE — Line Chart
// ─────────────────────────────────────────────────────
export const RevenueByDateChart = ({ data }) => (
  <div className="chart-container">
    <div className="chart-header">
      <h3 className="chart-title">Revenue Trend</h3>
      <span className="chart-badge">Last 14 Days</span>
    </div>
    <div style={{ height: 280 }}>
      {data?.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" axisLine={false} tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth()+1}`; }}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2.5}
              dot={{ r: 3, fill: '#7c3aed', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#7c3aed', stroke: 'white', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="empty-state"><div className="emoji">📈</div>No historical data yet</div>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────
// TOP PRODUCTS — Horizontal Bar + Ranking Table
// ─────────────────────────────────────────────────────
export const TopProductsChart = ({ data }) => (
  <div className="chart-container">
    <div className="chart-header">
      <h3 className="chart-title">Top Selling Products</h3>
      <span className="chart-badge">All Time</span>
    </div>
    <div style={{ height: 280 }}>
      {data?.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false}
              tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }} width={110}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="units_sold" name="Units Sold" radius={[0, 6, 6, 0]} barSize={22}>
              {data?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="empty-state"><div className="emoji">🍔</div>No product data yet</div>
      )}
    </div>
  </div>
);

export const ProductRankingTable = ({ data }) => (
  <div className="chart-container">
    <div className="chart-header">
      <h3 className="chart-title">Product Performance Ranking</h3>
    </div>
    {data?.length > 0 ? (
      <table className="product-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Product</th>
            <th>Category</th>
            <th style={{ textAlign: 'right' }}>Units Sold</th>
            <th style={{ textAlign: 'right' }}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, i) => (
            <tr key={i}>
              <td className="rank-cell">{i + 1}</td>
              <td className="product-name">{p.name}</td>
              <td><span className="category-badge">{p.category}</span></td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.units_sold?.toLocaleString()}</td>
              <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                ${p.revenue?.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <div className="empty-state"><div className="emoji">📋</div>No ranking data</div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────
// BRANCH PERFORMANCE — Bar Chart with best/worst highlight
// ─────────────────────────────────────────────────────
export const BranchPerformanceChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const best = data.reduce((a, b) => (a.revenue > b.revenue ? a : b));
  const worst = data.reduce((a, b) => (a.revenue < b.revenue ? a : b));

  return (
    <div className="chart-container full-width">
      <div className="chart-header">
        <h3 className="chart-title">Branch Revenue Comparison</h3>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--success)', fontWeight: 700 }}>🏆 Best: {best.branch}</span>
          <span style={{ color: 'var(--danger)', fontWeight: 700 }}>⚠ Worst: {worst.branch}</span>
        </div>
      </div>
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="branch" axisLine={false} tickLine={false}
              tick={{ fill: '#334155', fontSize: 11, fontWeight: 500 }}
              angle={-20} textAnchor="end" height={60}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} barSize={36}>
              {data.map((entry, i) => (
                <Cell key={i}
                  fill={entry.branch === best.branch ? '#10b981'
                      : entry.branch === worst.branch ? '#ef4444'
                      : '#7c3aed'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────
// INVENTORY ALERTS
// ─────────────────────────────────────────────────────
export const InventoryAlerts = ({ alerts }) => (
  <div className="chart-container" style={{ marginBottom: '1.75rem' }}>
    <div className="chart-header">
      <h3 className="chart-title">🚨 Inventory Alerts</h3>
      <span className="chart-badge">{alerts?.length || 0} items</span>
    </div>
    {!alerts || alerts.length === 0 ? (
      <div className="empty-state">
        <div className="emoji">✅</div>All products are sufficiently stocked
      </div>
    ) : (
      <div>
        {alerts.map((alert, i) => (
          <div key={i} className="alert-item" style={{
            backgroundColor: alert.severity === 'critical' ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${alert.severity === 'critical' ? '#fecaca' : '#fde68a'}`,
          }}>
            <div className="alert-info">
              <span className="alert-icon">{alert.severity === 'critical' ? '🔴' : '🟡'}</span>
              <div>
                <div className="alert-product" style={{
                  color: alert.severity === 'critical' ? '#991b1b' : '#92400e'
                }}>
                  {alert.product}
                </div>
                <div className="alert-detail">{alert.branch} · {alert.category}</div>
              </div>
            </div>
            <div className="alert-right">
              <div className="alert-stock">{alert.stock} units</div>
              <span className="alert-badge" style={{
                backgroundColor: alert.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'
              }}>
                {alert.severity === 'critical' ? 'CRITICAL' : 'LOW'}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────
// INSIGHT BOX
// ─────────────────────────────────────────────────────
export const InsightBox = ({ insights }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="insight-box">
      <div className="insight-title">
        <span>💡</span> AI Business Insights
      </div>
      <div className="insight-list">
        {insights.map((insight, i) => (
          <div key={i} className="insight-item">
            <span className="insight-icon">{insight.icon}</span>
            <span>{insight.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

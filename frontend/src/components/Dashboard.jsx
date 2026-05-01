import React from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';

const COLORS = ['#6F4E37', '#8C7851', '#A69076', '#C2B280', '#E5D3B3'];

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
    { label: 'Revenue Today',      value: `$${(data.revenue_today || 0).toLocaleString()}`, trend: data.revenue_trend_pct },
    { label: 'Orders Today',       value: (data.orders_today || 0).toLocaleString(), trend: null },
    { label: 'Avg Order Value',    value: `$${(data.avg_order_value || 0).toFixed(2)}`, trend: null },
    { label: 'Top Product',        value: data.top_product || 'N/A', trend: null },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card, i) => (
        <div key={i} className="kpi-card" id={`kpi-${i}`}>
          <div className="kpi-header">
            <div className="kpi-label">{card.label}</div>
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
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-light)', fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-light)', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2}
              fill="var(--primary-bg)" dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: 'var(--primary)', stroke: 'white', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="empty-state">No hourly data available for the selected period.</div>
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
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
            <XAxis dataKey="date" axisLine={false} tickLine={false}
              tick={{ fill: 'var(--text-light)', fontSize: 11 }}
              tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth()+1}`; }}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-light)', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2}
              dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: 'var(--primary)', stroke: 'white', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="empty-state">No historical revenue data available.</div>
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
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-light)" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-light)', fontSize: 11 }} />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }} width={110}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-main)' }} />
            <Bar dataKey="units_sold" name="Units Sold" radius={[0, 6, 6, 0]} barSize={22}>
              {data?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="empty-state">No product performance data available.</div>
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
              <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                ${p.revenue?.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <div className="empty-state">No ranking data available.</div>
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
          <span style={{ color: 'var(--success)', fontWeight: 700 }}>Best: {best.branch}</span>
          <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Worst: {worst.branch}</span>
        </div>
      </div>
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
            <XAxis dataKey="branch" axisLine={false} tickLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }}
              angle={-20} textAnchor="end" height={60}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-light)', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} barSize={36}>
              {data.map((entry, i) => (
                <Cell key={i}
                  fill={entry.branch === best.branch ? 'var(--success)'
                      : entry.branch === worst.branch ? 'var(--danger)'
                      : 'var(--primary)'}
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
      <h3 className="chart-title">Inventory Health Alerts</h3>
      <span className="chart-badge">{alerts?.length || 0} items requiring attention</span>
    </div>
    {!alerts || alerts.length === 0 ? (
      <div className="empty-state">
        All products are sufficiently stocked. No action required.
      </div>
    ) : (
      <div>
        {alerts.map((alert, i) => (
          <div key={i} className="alert-item" style={{
            backgroundColor: alert.severity === 'critical' ? 'var(--danger-bg)' : 'var(--warning-bg)',
            border: `1px solid ${alert.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'}`,
          }}>
            <div className="alert-info">
              <div>
                <div className="alert-product" style={{
                  color: alert.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'
                }}>
                  {alert.product}
                </div>
                <div className="alert-detail">
                  {alert.branch} · {alert.category}
                  {alert.expiry_date && (
                    <span style={{ marginLeft: '8px', color: alert.severity === 'critical' ? 'var(--danger)' : 'var(--text-light)', fontWeight: 600 }}>
                       · HSD: {alert.expiry_date}
                    </span>
                  )}
                  {alert.batch && <span style={{ marginLeft: '8px', opacity: 0.7 }}>· Lô: {alert.batch}</span>}
                </div>
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
        Performance Insights
      </div>
      <div className="insight-list">
        {insights.map((insight, i) => (
          <div key={i} className="insight-item">
            <span>{insight.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────
// REVENUE DISTRIBUTION — Pie Chart
// ─────────────────────────────────────────────────────
export const RevenueDistributionChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">Revenue Distribution</h3>
        <span className="chart-badge">By Branch</span>
      </div>
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="revenue"
              nameKey="branch"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

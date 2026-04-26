import { useState, useEffect, useCallback } from 'react';
import { Sidebar, Topbar } from './components/Layout';
import {
  KPICards, RevenueByHourChart, RevenueByDateChart,
  TopProductsChart, ProductRankingTable, BranchPerformanceChart,
  InventoryAlerts, InsightBox
} from './components/Dashboard';
import { supabase } from './utils/supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

function App() {
  // ── State ──────────────────────────────────────────
  const [role, setRole] = useState('MANAGER');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const [kpiData, setKpiData]                   = useState({});
  const [revenueByHour, setRevenueByHour]       = useState([]);
  const [revenueByDate, setRevenueByDate]       = useState([]);
  const [topProducts, setTopProducts]           = useState([]);
  const [branchPerformance, setBranchPerformance] = useState([]);
  const [inventoryAlerts, setInventoryAlerts]    = useState([]);
  const [insights, setInsights]                 = useState([]);
  const [branches, setBranches]                 = useState([]);

  // ── Fetch ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const bp = selectedBranch ? `?branch_id=${selectedBranch}` : '';

      const [kpi, hour, dateR, prod, branch, alert, insight, brList] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard/kpi${bp}`),
        fetch(`${API_BASE}/api/dashboard/revenue-by-hour${bp}`),
        fetch(`${API_BASE}/api/dashboard/revenue-by-date${bp}`),
        fetch(`${API_BASE}/api/dashboard/top-products${bp}`),
        fetch(`${API_BASE}/api/dashboard/branch-performance`),
        fetch(`${API_BASE}/api/dashboard/low-stock${bp}`),
        fetch(`${API_BASE}/api/dashboard/insights`),
        fetch(`${API_BASE}/api/branches`),
      ]);

      setKpiData(await kpi.json());
      setRevenueByHour(await hour.json());
      setRevenueByDate(await dateR.json());
      setTopProducts(await prod.json());
      setBranchPerformance(await branch.json());
      setInventoryAlerts(await alert.json());
      setInsights(await insight.json());
      setBranches(await brList.json());
      setLoading(false);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Supabase Realtime ──────────────────────────────
  useEffect(() => {
    const orderChannel = supabase
      .channel('realtime:orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'oltp', table: 'orders' }, () => {
        console.log('[Realtime] New order → refreshing dashboard');
        fetchData();
      })
      .subscribe();

    const inventoryChannel = supabase
      .channel('realtime:inventory')
      .on('postgres_changes', { event: 'UPDATE', schema: 'oltp', table: 'inventory_current' }, () => {
        console.log('[Realtime] Inventory changed → refreshing alerts');
        const bp = selectedBranch ? `?branch_id=${selectedBranch}` : '';
        fetch(`${API_BASE}/api/dashboard/low-stock${bp}`)
          .then(r => r.json())
          .then(d => setInventoryAlerts(d));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(inventoryChannel);
    };
  }, [fetchData, selectedBranch]);

  // ── Loading ────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div className="loading-text">Connecting to real-time analytics…</div>
      </div>
    );
  }

  // ── Helpers ────────────────────────────────────────
  const branchName = selectedBranch
    ? branches.find(b => String(b.id) === String(selectedBranch))?.name
    : null;

  // ── Render ─────────────────────────────────────────
  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role={role} />

      <main className="main-wrapper">
        <Topbar role={role} branchName={branchName} />

        <div className="content">
          {/* Page header + filters */}
          <div className="page-header">
            <div>
              <h2>Business Performance</h2>
              <p className="subtitle">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="filter-bar">
              {role === 'MANAGER' && (
                <select
                  id="filter-branch"
                  className="filter-select"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <option value="">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
              <select id="filter-period" className="filter-select">
                <option>Today</option>
                <option>Yesterday</option>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
              <button id="btn-refresh" className="btn-refresh" onClick={fetchData}>
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* ── OVERVIEW TAB ── */}
          {(activeTab === 'overview') && (
            <>
              <InsightBox insights={insights} />
              <KPICards data={kpiData} />
              <div className="charts-grid">
                <RevenueByHourChart data={revenueByHour} />
                <TopProductsChart data={topProducts} />
              </div>
              {role === 'MANAGER' && !selectedBranch && (
                <div className="charts-grid">
                  <BranchPerformanceChart data={branchPerformance} />
                </div>
              )}
              <InventoryAlerts alerts={inventoryAlerts} />
            </>
          )}

          {/* ── REVENUE TAB ── */}
          {activeTab === 'revenue' && (
            <>
              <KPICards data={kpiData} />
              <div className="charts-grid">
                <RevenueByHourChart data={revenueByHour} />
                <RevenueByDateChart data={revenueByDate} />
              </div>
            </>
          )}

          {/* ── PRODUCTS TAB ── */}
          {activeTab === 'products' && (
            <div className="charts-grid">
              <TopProductsChart data={topProducts} />
              <ProductRankingTable data={topProducts} />
            </div>
          )}

          {/* ── INVENTORY TAB ── */}
          {activeTab === 'inventory' && (
            <InventoryAlerts alerts={inventoryAlerts} />
          )}

          {/* ── BRANCHES TAB (Manager only) ── */}
          {activeTab === 'branches' && role === 'MANAGER' && (
            <div className="charts-grid">
              <BranchPerformanceChart data={branchPerformance} />
            </div>
          )}

          {/* ── DATA QUALITY TAB ── */}
          {activeTab === 'quality' && role === 'MANAGER' && (
            <DataQualityPanel />
          )}
        </div>
      </main>
    </div>
  );
}

// ── Inline Data Quality Panel ────────────────────────
function DataQualityPanel() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/api/system/data-quality`)
      .then(r => r.json())
      .then(d => { setChecks(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-text" style={{ padding: '2rem' }}>Running checks…</div>;

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">Data Quality Checks</h3>
      </div>
      <table className="product-table">
        <thead>
          <tr><th>Check</th><th>Status</th><th>Details</th></tr>
        </thead>
        <tbody>
          {checks.map((c, i) => (
            <tr key={i}>
              <td className="product-name">{c.check_name}</td>
              <td>
                <span className="category-badge" style={{
                  background: c.status === 'PASSED' ? 'var(--success-bg)' : 'var(--danger-bg)',
                  color: c.status === 'PASSED' ? '#059669' : '#dc2626',
                }}>
                  {c.status}
                </span>
              </td>
              <td>{c.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;

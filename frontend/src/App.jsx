import { useState, useEffect, useCallback } from 'react';
import { Sidebar, Topbar } from './components/Layout';
import {
  KPICards, RevenueByHourChart, RevenueByDateChart,
  TopProductsChart, ProductRankingTable, BranchPerformanceChart,
  InventoryAlerts, InsightBox, RevenueDistributionChart
} from './components/Dashboard';
import { supabase } from './utils/supabaseClient';

import Login from './components/Login';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

function App() {
  // ── Auth ───────────────────────────────────────────
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('STAFF');
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const updateRole = async (sess) => {
      if (sess?.user?.email) {
        try {
          const res = await fetch(`${API_BASE}/api/user/role?email=${sess.user.email}`);
          const data = await res.json();
          setRole(data.role || 'STAFF');
        } catch (err) {
          setRole('STAFF');
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) updateRole(session);
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) updateRole(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Dashboard State ────────────────────────────────
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
      setLoading(true);
      const bp = selectedBranch ? `?branch_id=${selectedBranch}` : '';
      
      console.log(`[Dashboard] Initiating fetch for branch: ${selectedBranch || 'All'}`);

      const [kpi, hour, dateR, prod, branch, alert, insight, brList] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard/kpi${bp}`).then(r => r.json()),
        fetch(`${API_BASE}/api/dashboard/revenue-by-hour${bp}`).then(r => r.json()),
        fetch(`${API_BASE}/api/dashboard/revenue-by-date${bp}`).then(r => r.json()),
        fetch(`${API_BASE}/api/dashboard/top-products${bp}`).then(r => r.json()),
        fetch(`${API_BASE}/api/dashboard/branch-performance`).then(r => r.json()),
        fetch(`${API_BASE}/api/dashboard/low-stock${bp}`).then(r => r.json()),
        fetch(`${API_BASE}/api/dashboard/insights`).then(r => r.json()),
        fetch(`${API_BASE}/api/branches`).then(r => r.json()),
      ]);

      console.log('[Dashboard] Data received:', { 
        kpi: !!kpi, 
        hour: hour?.length, 
        prod: prod?.length, 
        branches: brList?.length 
      });

      if (kpi) setKpiData(kpi);
      if (hour) setRevenueByHour(hour);
      if (dateR) setRevenueByDate(dateR);
      if (prod) setTopProducts(prod);
      if (branch) setBranchPerformance(branch);
      if (alert) setInventoryAlerts(alert);
      if (insight) setInsights(insight);
      if (brList) setBranches(brList);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      alert('Failed to load dashboard data. Please check your connection or backend status.');
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [fetchData, session]);

  // ── Loading ────────────────────────────────────────
  if (loadingAuth || (session && loading)) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div className="loading-text">
          {loadingAuth ? 'Verifying access...' : 'Loading Dashboard...'}
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
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
                  id="branch-selector"
                  className="branch-select"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <option value="">All Branches</option>
                  {branches.length > 0 ? (
                    branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))
                  ) : (
                    <option disabled>Loading branches...</option>
                  )}
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
                <RevenueDistributionChart data={branchPerformance} />
              </div>
              <TopProductsChart data={topProducts} />
              {role === 'MANAGER' && !selectedBranch && (
                <BranchPerformanceChart data={branchPerformance} />
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
              <div className="charts-grid">
                 <RevenueDistributionChart data={branchPerformance} />
                 {role === 'MANAGER' && <BranchPerformanceChart data={branchPerformance} />}
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
            <div style={{ maxWidth: '800px' }}>
              <InventoryAlerts alerts={inventoryAlerts} />
              <div className="empty-state" style={{ marginTop: '2rem' }}>
                Full inventory management module coming soon.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

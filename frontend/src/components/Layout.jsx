import React from 'react';

export const Sidebar = ({ activeTab, setActiveTab, role }) => {
  const mainNav = [
    { id: 'overview',  label: 'Overview' },
    { id: 'revenue',   label: 'Revenue' },
    { id: 'products',  label: 'Products' },
    { id: 'inventory', label: 'Inventory' },
  ];

  const managerNav = [
    { id: 'branches', label: 'Branches' },
    { id: 'quality',  label: 'Data Quality' },
  ];

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-header">
        <div className="logo-icon">FB</div>
        <div className="logo-text">F&B <span>Platform</span></div>
      </div>

      <div className="sidebar-section-label">Dashboard</div>
      <nav className="sidebar-nav">
        {mainNav.map((item) => (
          <div
            key={item.id}
            id={`nav-${item.id}`}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            {item.label}
          </div>
        ))}

        {role === 'MANAGER' && (
          <>
            <div className="sidebar-section-label" style={{ padding: '1rem 0.625rem 0.375rem' }}>Manager</div>
            {managerNav.map((item) => (
              <div
                key={item.id}
                id={`nav-${item.id}`}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                {item.label}
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="nav-item" style={{ color: 'var(--danger)' }} onClick={() => import('../utils/supabaseClient').then(m => m.supabase.auth.signOut())}>
          Logout
        </div>
      </div>
    </aside>
  );
};

export const Topbar = ({ role, branchName }) => {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="page-title">Dashboard</div>
        <div className="live-badge">
          <span className="live-dot"></span>
          Live
        </div>
      </div>
      <div className="topbar-right">
        <div className="user-profile">
          <div className="user-info">
            <span className="name">John Doe</span>
            <span className="role-label">
              {role === 'MANAGER' ? 'Manager' : 'Staff'}
              {branchName ? ` · ${branchName}` : ' · All Branches'}
            </span>
          </div>
          <div className="avatar">JD</div>
        </div>
      </div>
    </header>
  );
};

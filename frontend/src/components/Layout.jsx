import React from 'react';

export const Sidebar = ({ activeTab, setActiveTab, role }) => {
  const mainNav = [
    { id: 'overview',  label: 'Overview',  icon: '📊' },
    { id: 'revenue',   label: 'Revenue',   icon: '💰' },
    { id: 'products',  label: 'Products',  icon: '🍔' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
  ];

  const managerNav = [
    { id: 'branches', label: 'Branches', icon: '🏢' },
    { id: 'quality',  label: 'Data Quality', icon: '✅' },
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
            <span className="nav-icon">{item.icon}</span>
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
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="nav-item" style={{ color: 'var(--danger)' }}>
          <span className="nav-icon">🚪</span> Logout
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

import { useState, useEffect } from 'react';

function App() {
  const [revenue, setRevenue] = useState([]);
  const [topItems, setTopItems] = useState([]);

  useEffect(() => {
    // In a real app, these would fetch from the FastAPI backend:
    // fetch('http://localhost:8000/api/dashboard/revenue').then(...)
    
    // Using mock data for starter UI demonstration
    setRevenue([
      { branch_id: "B01", revenue: 1540.5 },
      { branch_id: "B02", revenue: 980.0 },
      { branch_id: "B03", revenue: 2100.75 }
    ]);

    setTopItems([
      { item_name: "Latte", total_sold: 145 },
      { item_name: "Espresso", total_sold: 120 },
      { item_name: "Croissant", total_sold: 85 }
    ]);
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif", backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ color: "#111827" }}>F&B Real-time Dashboard</h1>
        <p style={{ color: "#6b7280" }}>Role: Manager</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Revenue Card */}
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "1.25rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.5rem", color: "#374151" }}>Revenue per Branch</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {revenue.map(r => (
              <li key={r.branch_id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontWeight: "500" }}>Branch {r.branch_id}</span>
                <span style={{ color: "#059669", fontWeight: "bold" }}>${r.revenue.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Top Items Card */}
        <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ fontSize: "1.25rem", borderBottom: "1px solid #e5e7eb", paddingBottom: "0.5rem", color: "#374151" }}>Top Selling Items</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {topItems.map(item => (
              <li key={item.item_name} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f3f4f6" }}>
                <span>{item.item_name}</span>
                <span style={{ backgroundColor: "#e0e7ff", color: "#4f46e5", padding: "0.1rem 0.5rem", borderRadius: "999px", fontSize: "0.875rem" }}>
                  {item.total_sold} sold
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;

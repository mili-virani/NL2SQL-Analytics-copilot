import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8001";

export default function ConnectionsModal({ isOpen, onClose, token }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    db_type: "postgresql",
    host: "",
    port: "",
    database_name: "",
    username: "",
    password: "",
    ssl_enabled: false
  });

  const fetchConnections = async () => {
    try {
      const res = await fetch(`${API_BASE}/connections`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setConnections(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen && token) fetchConnections();
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/connections/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            ...formData,
            port: formData.port ? parseInt(formData.port, 10) : null
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/connections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            ...formData,
            port: formData.port ? parseInt(formData.port, 10) : null
        })
      });
      if (res.ok) {
        setAddingNew(false);
        setFormData({ name: "", db_type: "postgresql", host: "", port: "", database_name: "", username: "", password: "", ssl_enabled: false });
        setTestResult(null);
        fetchConnections();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await fetch(`${API_BASE}/connections/${id}/activate`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      fetchConnections();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_BASE}/connections/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      fetchConnections();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#11131a", width: 600, maxHeight: "90vh", borderRadius: 16, border: "1px solid #2a2d3d", display: "flex", flexDirection: "column", overflow: "hidden", color: "#c8d0e8", fontFamily: "var(--sans)" }}>
        
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #1e2230", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0e1017" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>Data Sources</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8fa1c7", cursor: "pointer", fontSize: 20 }}>&times;</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {!addingNew ? (
            <>
              {connections.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#8fa1c7" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🔌</div>
                  <h3 style={{ margin: "0 0 8px", color: "#e2e8f0" }}>No Connections Found</h3>
                  <p style={{ margin: "0 0 20px", fontSize: 14 }}>Connect a database to query it via natural language.</p>
                  <button onClick={() => setAddingNew(true)} style={{ padding: "10px 20px", background: "linear-gradient(135deg, #3a2a80, #5a3ab0)", color: "#fff", border: "1px solid #5a40c0", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Add Connection</button>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 14, color: "#8fa1c7", textTransform: "uppercase", letterSpacing: "0.05em" }}>Your Databases</h3>
                    <button onClick={() => setAddingNew(true)} style={{ padding: "6px 12px", background: "#1a1d2a", color: "#c8d0e8", border: "1px solid #2a2d3d", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>+ New</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {connections.map(c => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, background: c.is_active ? "#121a2f" : "#0e1017", border: c.is_active ? "1px solid #4a9eff" : "1px solid #1e2230", borderRadius: 12 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: c.is_active ? "#fff" : "#c8d0e8" }}>{c.name}</span>
                            {c.is_active && <span style={{ padding: "2px 6px", background: "#1a3a5c", color: "#4a9eff", borderRadius: 4, fontSize: 10, fontWeight: "bold" }}>ACTIVE</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "#6a7a9a", fontFamily: "monospace" }}>{c.db_type.toUpperCase()} • {c.host || "localhost"}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {!c.is_active && <button onClick={() => handleActivate(c.id)} style={{ padding: "6px 12px", background: "#122a20", color: "#4adb8a", border: "1px solid #1a3d2e", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Select</button>}
                          <button onClick={() => handleDelete(c.id)} style={{ padding: "6px 12px", background: "transparent", color: "#e24b4a", border: "1px solid #3a1010", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Configure Connection</h3>
                <button type="button" onClick={() => setAddingNew(false)} style={{ background: "none", border: "none", color: "#8fa1c7", cursor: "pointer", fontSize: 13 }}>Cancel</button>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#8fa1c7", marginBottom: 6 }}>Connection Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Production Replica" style={{ width: "100%", padding: "10px 12px", background: "#0a0d16", border: "1px solid #1e2230", color: "#fff", borderRadius: 8, outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: "#8fa1c7", marginBottom: 6 }}>Engine</label>
                  <select value={formData.db_type} onChange={e => setFormData({...formData, db_type: e.target.value})} style={{ width: "100%", padding: "10px 12px", background: "#0a0d16", border: "1px solid #1e2230", color: "#fff", borderRadius: 8, outline: "none", appearance: "none" }}>
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="sqlite">SQLite</option>
                    <option value="sqlserver">SQL Server</option>
                  </select>
                </div>
              </div>

              {formData.db_type !== "sqlite" && (
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#8fa1c7", marginBottom: 6 }}>Host</label>
                    <input value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} placeholder="Database host" style={{ width: "100%", padding: "10px 12px", background: "#0a0d16", border: "1px solid #1e2230", color: "#fff", borderRadius: 8, outline: "none" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#8fa1c7", marginBottom: 6 }}>Port</label>
                    <input type="number" value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})} placeholder="port" style={{ width: "100%", padding: "10px 12px", background: "#0a0d16", border: "1px solid #1e2230", color: "#fff", borderRadius: 8, outline: "none" }} />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 12, color: "#8fa1c7", marginBottom: 6 }}>Database Name / Path (SQLite)</label>
                <input required value={formData.database_name} onChange={e => setFormData({...formData, database_name: e.target.value})} placeholder="postgres" style={{ width: "100%", padding: "10px 12px", background: "#0a0d16", border: "1px solid #1e2230", color: "#fff", borderRadius: 8, outline: "none" }} />
              </div>

              {formData.db_type !== "sqlite" && (
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#8fa1c7", marginBottom: 6 }}>Username</label>
                    <input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} style={{ width: "100%", padding: "10px 12px", background: "#0a0d16", border: "1px solid #1e2230", color: "#fff", borderRadius: 8, outline: "none" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#8fa1c7", marginBottom: 6 }}>Password</label>
                    <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={{ width: "100%", padding: "10px 12px", background: "#0a0d16", border: "1px solid #1e2230", color: "#fff", borderRadius: 8, outline: "none" }} />
                  </div>
                </div>
              )}

              {testResult && (
                <div style={{ padding: 12, borderRadius: 8, background: testResult.success ? "#0d2d20" : "#3d101a", border: testResult.success ? "1px solid #1a3d2e" : "1px solid #5a1020", color: testResult.success ? "#4adb8a" : "#e24b4a", fontSize: 13 }}>
                  {testResult.success ? "✓ " + testResult.message : "✕ " + (testResult.error || "Connection failed")}
                </div>
              )}

              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button type="button" onClick={handleTest} disabled={loading} style={{ flex: 1, padding: "12px", background: "#1a1d2a", color: "#c8d0e8", border: "1px solid #2a2d3d", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                  Test Connection
                </button>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #3a2a80, #5a3ab0)", color: "#fff", border: "1px solid #5a40c0", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                  {loading ? "Saving..." : "Save Connection"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

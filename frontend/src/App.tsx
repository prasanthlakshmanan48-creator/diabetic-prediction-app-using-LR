import React, { useState, useEffect } from "react";
import { auth, onAuthStateChanged, signOut, User } from "./firebase";
import { Auth } from "./components/Auth";
import { Dashboard } from "./components/Dashboard";
import { PredictionForm } from "./components/PredictionForm";
import { PredictionHistory } from "./components/PredictionHistory";

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "prediction" | "history" | "reports" | "settings">("dashboard");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#080e1e",
        color: "#00c49f",
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🩺</div>
          <p>Loading secure clinical environment...</p>
        </div>
      </div>
    );
  }

  // Authentication Gate: Require login before accessing application
  if (!user) {
    return <Auth />;
  }

  return (
    <div className="app-layout">
      {/* TOP HEADER */}
      <header className="topbar">
        <div className="brand-section">
          <div className="brand-icon">🩺</div>
          <div className="brand-text">
            <h1 className="brand-title">Diabetes Risk Prediction System</h1>
            <span className="brand-badge">Biomedical Engineering Project</span>
          </div>
        </div>

        <div className="user-profile-badge">
          <div className="user-avatar">
            {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="user-info-text">
            <span className="user-name">{user.displayName || user.email?.split("@")[0] || "User"}</span>
            <span className="user-status-dot online"></span>
          </div>
          <button 
            onClick={handleLogout} 
            className="btn-logout"
            title="Sign Out"
            style={{
              marginLeft: "12px",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#ef4444",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER: SIDEBAR + CONTENT */}
      <div className="main-wrapper">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              <span className="nav-icon">⊞</span>
              <span className="nav-label">Dashboard</span>
            </button>

            <button
              className={`nav-item ${activeTab === "prediction" ? "active" : ""}`}
              onClick={() => setActiveTab("prediction")}
            >
              <span className="nav-icon">🎯</span>
              <span className="nav-label">Prediction</span>
            </button>

            <button
              className={`nav-item ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <span className="nav-icon">📋</span>
              <span className="nav-label">History</span>
            </button>

            <button
              className={`nav-item ${activeTab === "reports" ? "active" : ""}`}
              onClick={() => setActiveTab("reports")}
            >
              <span className="nav-icon">📄</span>
              <span className="nav-label">Reports</span>
            </button>

            <button
              className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-label">Settings</span>
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="system-pill">
              <span className="pulse-indicator"></span>
              <span>FastAPI + Firebase Engine</span>
            </div>
            <p className="footer-uid" style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "8px", wordBreak: "break-all" }}>
              UID: {user.uid.slice(0, 14)}...
            </p>
          </div>
        </aside>

        {/* CONTENT PANELS */}
        <main className="content-container">
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab === "prediction" && (
            <PredictionForm onPredictionComplete={() => setActiveTab("history")} />
          )}
          {(activeTab === "history" || activeTab === "reports") && <PredictionHistory />}
          {activeTab === "settings" && (
            <div className="content-area">
              <div className="view-header">
                <h2 className="view-title">
                  <span style={{ color: "#00c49f" }}>⚙️</span>
                  <span>User & System Settings</span>
                </h2>
                <p className="view-subtitle">Private user session and verified security details</p>
              </div>

              <div className="card" style={{ maxWidth: "600px", padding: "24px" }}>
                <h3 style={{ color: "#ffffff", marginBottom: "16px", fontSize: "1.1rem" }}>
                  Verified Identity Credentials
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", color: "#94a3b8", fontSize: "0.9rem" }}>
                  <div>
                    <strong style={{ color: "#e2e8f0" }}>Firebase Authentication UID:</strong>
                    <div style={{ background: "#0a1122", padding: "8px 12px", borderRadius: "6px", fontFamily: "monospace", color: "#00c49f", marginTop: "4px" }}>
                      {user.uid}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: "#e2e8f0" }}>Registered Email:</strong>
                    <div style={{ background: "#0a1122", padding: "8px 12px", borderRadius: "6px", color: "#ffffff", marginTop: "4px" }}>
                      {user.email}
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: "#e2e8f0" }}>Data Privacy Scope:</strong>
                    <div style={{ background: "#0a1122", padding: "8px 12px", borderRadius: "6px", color: "#10b981", marginTop: "4px" }}>
                      ✓ Strictly Isolated (Bearer Token verified by Firebase Admin SDK)
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: "#e2e8f0" }}>Database Filter:</strong>
                    <div style={{ background: "#0a1122", padding: "8px 12px", borderRadius: "6px", color: "#94a3b8", marginTop: "4px" }}>
                      `WHERE user_uid = '{user.uid}'`
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "24px" }}>
                  <button 
                    onClick={handleLogout} 
                    className="btn btn-primary"
                    style={{ background: "#ef4444", borderColor: "#ef4444", width: "100%" }}
                  >
                    Sign Out of Secure Session
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;

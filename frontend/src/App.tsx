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
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🩺</div>
          <p style={{ fontWeight: 600 }}>Loading secure clinical environment...</p>
        </div>
      </div>
    );
  }

  // Authentication Gate: Require login before accessing application
  if (!user) {
    return <Auth />;
  }

  const username = user.displayName || user.email?.split("@")[0] || "Clinician";

  return (
    <>
      {/* TOP HEADER BAR (EXACT DESIGN MATCH) */}
      <header className="app-header">
        <div className="brand-section" style={{ cursor: "pointer" }} onClick={() => setActiveTab("dashboard")}>
          <div className="brand-icon-box">🩺</div>
          <div className="brand-text">
            <h1>Diabetes Risk Prediction System</h1>
            <p>Biomedical Engineering Project</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="user-status">
            Logged in as <strong>{username}</strong>
          </div>

          <button 
            type="button"
            onClick={handleLogout} 
            className="btn-header-logout"
            title="Sign out of system"
          >
            <span>↳ Logout</span>
          </button>
        </div>
      </header>

      {/* MAIN BODY (SIDEBAR + CONTENT) */}
      <div className="app-body">
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className="sidebar">
          <div>
            <div className="nav-group-title">NAVIGATION</div>
            <nav className="sidebar-menu">
              <button
                type="button"
                className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => setActiveTab("dashboard")}
              >
                <span className="nav-icon">⊞</span>
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                className={`nav-item ${activeTab === "prediction" ? "active" : ""}`}
                onClick={() => setActiveTab("prediction")}
              >
                <span className="nav-icon">🎯</span>
                <span>Prediction</span>
              </button>

              <button
                type="button"
                className={`nav-item ${activeTab === "reports" ? "active" : ""}`}
                onClick={() => setActiveTab("reports")}
              >
                <span className="nav-icon">📄</span>
                <span>Reports</span>
              </button>

              <button
                type="button"
                className={`nav-item ${activeTab === "history" ? "active" : ""}`}
                onClick={() => setActiveTab("history")}
              >
                <span className="nav-icon">🕒</span>
                <span>History</span>
              </button>

              <button
                type="button"
                className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                <span className="nav-icon">⚙️</span>
                <span>Settings</span>
              </button>
            </nav>
          </div>

          <div className="sidebar-footer">
            <button 
              type="button"
              onClick={handleLogout} 
              className="btn-sidebar-logout"
            >
              <span>↳ Logout</span>
            </button>
            <div className="sidebar-dept-tag">B.E. Biomedical Engineering</div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
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
                <span>Account & System Settings</span>
              </h2>
              <p className="view-subtitle">Private user session and verified security details</p>
            </div>

            <div className="card" style={{ maxWidth: "600px", padding: "28px" }}>
              <h3 style={{ color: "#ffffff", marginBottom: "18px", fontSize: "1.15rem" }}>
                Active Session Details
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", color: "#94a3b8", fontSize: "0.92rem" }}>
                <div>
                  <strong style={{ color: "#e2e8f0" }}>Clinician Email:</strong>
                  <div style={{ background: "#0a1122", padding: "10px 14px", borderRadius: "8px", color: "#00c49f", marginTop: "6px" }}>
                    {user.email || "Guest Clinician"}
                  </div>
                </div>
                <div>
                  <strong style={{ color: "#e2e8f0" }}>User Security Identifier (UID):</strong>
                  <div style={{ background: "#0a1122", padding: "10px 14px", borderRadius: "8px", fontFamily: "monospace", color: "#38bdf8", marginTop: "6px" }}>
                    {user.uid}
                  </div>
                </div>
                <div>
                  <strong style={{ color: "#e2e8f0" }}>Data Privacy Scope:</strong>
                  <div style={{ background: "#0a1122", padding: "10px 14px", borderRadius: "8px", color: "#10b981", marginTop: "6px" }}>
                    ✓ Strictly Isolated Clinical Workspace
                  </div>
                </div>
                <div style={{ marginTop: "10px" }}>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      color: "#ef4444",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      padding: "10px 18px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    <span>🚪</span> Sign Out of Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default App;

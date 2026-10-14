import React, { useState, useEffect } from "react";
import { api } from "../api";
import { auth } from "../firebase";

export const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUserDashboard();
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const currentUser = auth.currentUser;

  return (
    <div className="content-area">
      <div className="view-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 className="view-title">
              <span style={{ color: "#00c49f" }}>⊞</span>
              <span>Personal Health Analytics Dashboard</span>
            </h2>
            <p className="view-subtitle">
              Logged in as: <strong style={{ color: "#ffffff" }}>{currentUser?.displayName || currentUser?.email || "User"}</strong>{" "}
              <span style={{ color: "#00c49f" }}>({currentUser?.email})</span>
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          Loading your personal analytics...
        </div>
      )}

      {error && (
        <div className="alert-box alert-error">
          {error}
        </div>
      )}

      {!loading && !error && dashboardData && (
        <>
          {/* STATS OVERVIEW */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px", marginBottom: "28px" }}>
            <div className="graph-box" style={{ padding: "20px" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                Total Patient Checkups
              </div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "#ffffff", marginTop: "4px" }}>
                {dashboardData.total_assessments}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#00c49f", marginTop: "4px" }}>Private User Records</div>
            </div>

            <div className="graph-box" style={{ padding: "20px" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                Average Risk Score
              </div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "#00c49f", marginTop: "4px" }}>
                {dashboardData.average_risk}%
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>Based on your assessments</div>
            </div>

            <div className="graph-box" style={{ padding: "20px" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                Avg Fasting Glucose
              </div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "#3b82f6", marginTop: "4px" }}>
                {dashboardData.average_glucose} mg/dL
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>Clinical normal: &lt;100</div>
            </div>
          </div>

          {/* LATEST PREDICTION OR EMPTY STATE */}
          {dashboardData.total_assessments > 0 && dashboardData.latest_prediction ? (
            <div className="form-panel" style={{ marginBottom: "28px" }}>
              <div className="panel-header">
                <div className="panel-title">
                  <span>🩺</span>
                  <span>Your Latest Patient Assessment</span>
                </div>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{dashboardData.latest_prediction.date}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ffffff" }}>
                    {dashboardData.latest_prediction.patient_name}
                  </h3>
                  <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "4px" }}>
                    Assessed Category:{" "}
                    <strong style={{ color: dashboardData.latest_prediction.probability >= 70 ? "#ef4444" : "#00c49f" }}>
                      {dashboardData.latest_prediction.risk_category}
                    </strong>
                  </p>
                </div>
                <div style={{ background: "#080e1e", border: "1px solid #1a2744", padding: "12px 24px", borderRadius: "10px", textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b" }}>Risk Probability</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 800, color: dashboardData.latest_prediction.probability >= 70 ? "#ef4444" : "#00c49f" }}>
                    {dashboardData.latest_prediction.probability}%
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="table-card" style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>📊</div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ffffff", marginBottom: "6px" }}>
                No prediction history available
              </h3>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", maxWidth: "500px", margin: "0 auto 20px" }}>
                You have not performed any patient diabetes assessments yet. Your personal statistics and historical charts will appear here once you run a prediction.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

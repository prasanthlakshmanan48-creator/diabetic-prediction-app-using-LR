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
        <div className="alert-box alert-error" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <strong>System Connection Status:</strong> {error}
          </div>
          <button
            type="button"
            onClick={loadDashboard}
            style={{
              background: "#00c49f",
              color: "#080e1e",
              border: "none",
              padding: "6px 16px",
              borderRadius: "6px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "0.85rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            🔄 Retry Connection
          </button>
        </div>
      )}

      {!loading && !error && dashboardData && (
        <>
          {/* 4 PRIMARY METRICS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div className="graph-box" style={{ padding: "20px" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                Total Predictions
              </div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "#ffffff", marginTop: "4px" }}>
                {dashboardData.total_assessments}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#00c49f", marginTop: "4px" }}>Private Patient Records</div>
            </div>

            <div className="graph-box" style={{ padding: "20px" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#ef4444" }}>
                High Risk Cases
              </div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "#ef4444", marginTop: "4px" }}>
                {dashboardData.high_risk_count ?? 0}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>Critical clinical focus</div>
            </div>

            <div className="graph-box" style={{ padding: "20px" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#f59e0b" }}>
                Medium Risk Cases
              </div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "#f59e0b", marginTop: "4px" }}>
                {dashboardData.medium_risk_count ?? 0}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>Prediabetes watch</div>
            </div>

            <div className="graph-box" style={{ padding: "20px" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#10b981" }}>
                Low Risk Cases
              </div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontSize: "2.2rem", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>
                {dashboardData.low_risk_count ?? 0}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>Normal healthy baseline</div>
            </div>
          </div>

          {/* SECONDARY AVERAGES & RISK DISTRIBUTION */}
          {dashboardData.total_assessments > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "18px", marginBottom: "26px" }}>
              {/* Risk Distribution Bar */}
              <div className="graph-box" style={{ padding: "20px" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: "12px" }}>
                  Risk Distribution Breakdown
                </div>
                <div style={{ display: "flex", height: "18px", borderRadius: "9px", overflow: "hidden", background: "#080e1e", border: "1px solid #1a2744", marginBottom: "12px" }}>
                  <div
                    style={{
                      width: `${(dashboardData.high_risk_count / dashboardData.total_assessments) * 100}%`,
                      background: "#ef4444",
                    }}
                    title={`High Risk: ${dashboardData.high_risk_count}`}
                  />
                  <div
                    style={{
                      width: `${(dashboardData.medium_risk_count / dashboardData.total_assessments) * 100}%`,
                      background: "#f59e0b",
                    }}
                    title={`Medium Risk: ${dashboardData.medium_risk_count}`}
                  />
                  <div
                    style={{
                      width: `${(dashboardData.low_risk_count / dashboardData.total_assessments) * 100}%`,
                      background: "#10b981",
                    }}
                    title={`Low Risk: ${dashboardData.low_risk_count}`}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#94a3b8" }}>
                  <span>🔴 High: {dashboardData.high_risk_count} ({Math.round(((dashboardData.high_risk_count || 0) / dashboardData.total_assessments) * 100)}%)</span>
                  <span>🟡 Med: {dashboardData.medium_risk_count} ({Math.round(((dashboardData.medium_risk_count || 0) / dashboardData.total_assessments) * 100)}%)</span>
                  <span>🟢 Low: {dashboardData.low_risk_count} ({Math.round(((dashboardData.low_risk_count || 0) / dashboardData.total_assessments) * 100)}%)</span>
                </div>
              </div>

              {/* Averages */}
              <div className="graph-box" style={{ padding: "20px", display: "flex", justifyContent: "space-around", alignItems: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                    Avg Risk Probability
                  </div>
                  <div style={{ fontFamily: "Outfit, sans-serif", fontSize: "2rem", fontWeight: 800, color: "#00c49f", marginTop: "4px" }}>
                    {dashboardData.average_risk}%
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>Population score</div>
                </div>
                <div style={{ width: "1px", height: "50px", background: "#1a2744" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                    Avg Fasting Glucose
                  </div>
                  <div style={{ fontFamily: "Outfit, sans-serif", fontSize: "2rem", fontWeight: 800, color: "#3b82f6", marginTop: "4px" }}>
                    {dashboardData.average_glucose} <span style={{ fontSize: "1rem" }}>mg/dL</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>Normal &lt; 100 mg/dL</div>
                </div>
              </div>
            </div>
          )}

          {/* RECENT PREDICTIONS TABLE */}
          {dashboardData.recent_predictions && dashboardData.recent_predictions.length > 0 && (
            <div className="form-panel" style={{ marginBottom: "28px" }}>
              <div className="panel-header">
                <div className="panel-title">
                  <span>🕒</span>
                  <span>Recent Patient Predictions</span>
                </div>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Latest 5 assessments</span>
              </div>
              <div className="table-responsive">
                <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #1a2744" }}>
                      <th style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.8rem" }}>PATIENT</th>
                      <th style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.8rem" }}>RISK OUTCOME</th>
                      <th style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.8rem" }}>PROBABILITY</th>
                      <th style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.8rem" }}>GLUCOSE</th>
                      <th style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.8rem" }}>BMI</th>
                      <th style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.8rem" }}>DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recent_predictions.map((p: any) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid rgba(26, 39, 68, 0.5)" }}>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: "#ffffff" }}>{p.patient_name}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span
                            className="badge"
                            style={{
                              background: p.probability >= 65 ? "rgba(239, 68, 68, 0.15)" : p.probability >= 40 ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                              color: p.probability >= 65 ? "#ef4444" : p.probability >= 40 ? "#f59e0b" : "#10b981",
                              border: `1px solid ${p.probability >= 65 ? "rgba(239, 68, 68, 0.3)" : p.probability >= 40 ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                            }}
                          >
                            {p.risk_category}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: 700, color: "#ffffff" }}>{p.probability}%</td>
                        <td style={{ padding: "12px 14px", color: "#cbd5e1" }}>{p.glucose} mg/dL</td>
                        <td style={{ padding: "12px 14px", color: "#cbd5e1" }}>{p.bmi}</td>
                        <td style={{ padding: "12px 14px", color: "#64748b", fontSize: "0.85rem" }}>{p.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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

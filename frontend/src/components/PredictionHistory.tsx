import React, { useState, useEffect } from "react";
import { api } from "../api";

interface HistoryRecord {
  id: number;
  patient_name: string;
  date: string;
  risk_level: string;
  probability: string;
  probability_value: number;
  historical_comparison: string;
  glucose: number;
  blood_pressure: number;
  bmi: number;
  insulin: number;
  age: number;
  algorithm_used: string;
}

export const PredictionHistory: React.FC = () => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  useEffect(() => {
    loadUserHistory();
  }, []);

  const loadUserHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUserHistory();
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err.message || "Failed to load private prediction history.");
    } finally {
      setLoading(false);
    }
  };

  const openReport = async (reportId: number) => {
    try {
      const report = await api.getUserReport(reportId);
      setSelectedReport(report);
    } catch (err: any) {
      alert(err.message || "Could not retrieve report.");
    }
  };

  const filteredRecords = history.filter((record) => {
    const matchesSearch = record.patient_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === "ALL" || record.risk_level.includes(riskFilter);
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="content-area">
      <div className="view-header">
        <h2 className="view-title">
          <span style={{ color: "#00c49f" }}>🕒</span>
          <span>Prediction History</span>
        </h2>
        <p className="view-subtitle">Private assessment history associated with your authenticated account.</p>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="filter-bar">
        <div className="search-box-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search patient ID or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-dropdown-wrapper">
          <span style={{ color: "#64748b", fontSize: "1rem" }}>⚚</span>
          <select
            className="filter-select"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="ALL">All Risk Levels</option>
            <option value="High Risk">High Risk</option>
            <option value="Medium Risk">Medium Risk</option>
            <option value="Low Risk">Low Risk</option>
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          <span>Loading your private records...</span>
        </div>
      )}

      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: "20px" }}>
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="table-card">
          <div style={{ overflowX: "auto" }}>
            <table className="clinical-table">
              <thead>
                <tr>
                  <th>Patient ID / Subject</th>
                  <th>Date</th>
                  <th>Risk Level</th>
                  <th>Probability</th>
                  <th>Historical Comparison</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, color: "#ffffff" }}>{item.patient_name}</td>
                      <td style={{ color: "#94a3b8", fontSize: "0.88rem" }}>{item.date}</td>
                      <td>
                        <span
                          className={`risk-pill ${
                            item.risk_level.includes("High")
                              ? "high"
                              : item.risk_level.includes("Low")
                              ? "low"
                              : "medium"
                          }`}
                        >
                          {item.risk_level}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: "#ffffff" }}>{item.probability}</td>
                      <td className="comparison-text">{item.historical_comparison}</td>
                      <td>
                        <button
                          type="button"
                          className="action-link"
                          style={{ background: "none", border: "none", cursor: "pointer" }}
                          onClick={() => openReport(item.id)}
                        >
                          <span>📄 View Report</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "48px", color: "#64748b" }}>
                      <div style={{ fontSize: "32px", marginBottom: "8px" }}>📋</div>
                      <div style={{ fontWeight: 700, color: "#ffffff", fontSize: "1.05rem" }}>
                        No prediction history available
                      </div>
                      <p style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                        You have not performed any patient assessments yet. All your private records will appear here.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {selectedReport && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#0d172b",
              border: "1px solid #1a2744",
              borderRadius: "16px",
              width: "90%",
              maxWidth: "580px",
              padding: "28px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
                borderBottom: "1px solid #1a2744",
                paddingBottom: "12px",
              }}
            >
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ffffff" }}>
                Patient: {selectedReport.patient_name}
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.3rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", background: "#080e1e", padding: "12px 16px", borderRadius: "8px" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Date</div>
                <div style={{ fontSize: "0.9rem", color: "#ffffff" }}>{selectedReport.created_at}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Risk Assessment</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: selectedReport.probability >= 70 ? "#ef4444" : "#00c49f" }}>
                  {selectedReport.probability}% ({selectedReport.risk_category})
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "20px" }}>
              <div style={{ background: "#080e1e", padding: "10px 14px", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Fasting Glucose</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>{selectedReport.biometrics.glucose} mg/dL</div>
              </div>
              <div style={{ background: "#080e1e", padding: "10px 14px", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Blood Pressure</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>{selectedReport.biometrics.blood_pressure} mmHg</div>
              </div>
              <div style={{ background: "#080e1e", padding: "10px 14px", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Body Mass Index</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>{selectedReport.biometrics.bmi} kg/m²</div>
              </div>
              <div style={{ background: "#080e1e", padding: "10px 14px", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Serum Insulin</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>{selectedReport.biometrics.insulin} μU/mL</div>
              </div>
            </div>

            {selectedReport.graph_base64 && (
              <div style={{ textAlign: "center", marginBottom: "18px" }}>
                <img
                  src={`data:image/png;base64,${selectedReport.graph_base64}`}
                  alt="Clinical Diagnostic Report"
                  style={{ maxWidth: "100%", borderRadius: "8px", border: "1px solid #1a2744" }}
                />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn-chip"
                onClick={() => setSelectedReport(null)}
                style={{ padding: "8px 18px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

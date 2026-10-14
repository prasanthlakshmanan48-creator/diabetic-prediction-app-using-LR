import React, { useState } from "react";
import { api, PatientPredictionInput } from "../api";

interface PredictionFormProps {
  onPredictionComplete?: () => void;
}

export const PredictionForm: React.FC<PredictionFormProps> = ({ onPredictionComplete }) => {
  const [formData, setFormData] = useState<PatientPredictionInput>({
    patient_name: "Patient #1",
    pregnancies: 1,
    glucose: 115,
    blood_pressure: 72,
    skin_thickness: 22,
    insulin: 80,
    bmi: 27.4,
    diabetes_pedigree: 0.38,
    age: 34,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const loadNormalPreset = () => {
    setFormData({
      patient_name: "Patient #1",
      pregnancies: 1,
      glucose: 92,
      blood_pressure: 68,
      skin_thickness: 20,
      insulin: 72,
      bmi: 22.8,
      diabetes_pedigree: 0.245,
      age: 28,
    });
  };

  const loadHighRiskPreset = () => {
    setFormData({
      patient_name: "prasa",
      pregnancies: 5,
      glucose: 168,
      blood_pressure: 84,
      skin_thickness: 32,
      insulin: 180,
      bmi: 34.6,
      diabetes_pedigree: 0.68,
      age: 48,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.predictDiabetes(formData);
      setResult(res);
      if (onPredictionComplete) {
        onPredictionComplete();
      }
    } catch (err: any) {
      setError(err.message || "Failed to process prediction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-area">
      <div className="view-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <h2 className="view-title">
              <span style={{ color: "#00c49f" }}>🩺</span>
              <span>Clinical Diabetes Risk Assessment</span>
            </h2>
            <p className="view-subtitle">Private assessment saved strictly to your account.</p>
          </div>

          <div className="preset-pills">
            <button type="button" onClick={loadNormalPreset} className="btn-chip">
              🟢 Load Normal Health Sample
            </button>
            <button type="button" onClick={loadHighRiskPreset} className="btn-chip">
              🔴 Load Elevated Risk Sample
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert-box alert-error">{error}</div>}

      <div className="form-panel">
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px", maxWidth: "400px" }}>
            <div className="form-field">
              <label>Patient Identifier / Name</label>
              <input
                type="text"
                name="patient_name"
                value={formData.patient_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid-inputs">
            <div className="form-field">
              <label>Pregnancies</label>
              <input type="number" name="pregnancies" value={formData.pregnancies} onChange={handleChange} min={0} max={25} required />
            </div>
            <div className="form-field">
              <label>Fasting Glucose (mg/dL)</label>
              <input type="number" name="glucose" value={formData.glucose} onChange={handleChange} min={0} max={400} required />
            </div>
            <div className="form-field">
              <label>Blood Pressure (mmHg)</label>
              <input type="number" name="blood_pressure" value={formData.blood_pressure} onChange={handleChange} min={0} max={200} required />
            </div>
            <div className="form-field">
              <label>Skin Thickness (mm)</label>
              <input type="number" name="skin_thickness" value={formData.skin_thickness} onChange={handleChange} min={0} max={100} required />
            </div>
            <div className="form-field">
              <label>Serum Insulin (μU/mL)</label>
              <input type="number" name="insulin" value={formData.insulin} onChange={handleChange} min={0} max={900} required />
            </div>
            <div className="form-field">
              <label>Body Mass Index (BMI)</label>
              <input type="number" name="bmi" value={formData.bmi} onChange={handleChange} step={0.1} min={10} max={70} required />
            </div>
            <div className="form-field">
              <label>Diabetes Pedigree Function</label>
              <input type="number" name="diabetes_pedigree" value={formData.diabetes_pedigree} onChange={handleChange} step={0.001} min={0} max={3} required />
            </div>
            <div className="form-field">
              <label>Patient Age (Years)</label>
              <input type="number" name="age" value={formData.age} onChange={handleChange} min={1} max={120} required />
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn-primary-teal" disabled={loading}>
              {loading ? "Processing Assessment..." : "⚡ Run Prediction & Save to History"}
            </button>
          </div>
        </form>
      </div>

      {result && (
        <div style={{ marginTop: "32px" }}>
          <div style={{ background: "#0d172b", border: "1.5px solid " + (result.risk_category === "High Risk" ? "#ef4444" : "#00c49f"), borderRadius: "14px", padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <h3 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#ffffff" }}>{result.risk_category}</h3>
              <p style={{ color: "#94a3b8" }}>Recorded strictly in your private patient history.</p>
            </div>
            <div style={{ background: "#080e1e", padding: "12px 24px", borderRadius: "10px", textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Calculated Probability</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: result.probability >= 70 ? "#ef4444" : "#00c49f" }}>
                {result.probability}%
              </div>
            </div>
          </div>

          {result.graph_base64 && (
            <div className="matplotlib-panel">
              <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff", marginBottom: "14px" }}>
                📈 Publication Diagnostic Graphic (Matplotlib Engine)
              </h4>
              <div className="matplotlib-img-wrap">
                <img src={`data:image/png;base64,${result.graph_base64}`} alt="Diagnostic Assessment Chart" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

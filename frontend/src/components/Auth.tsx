import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  auth,
  loginWithDemo,
  isFirebaseConfigured
} from "../firebase";

export const Auth: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showDemoPrompt, setShowDemoPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowDemoPrompt(false);

    const trimmedEmail = email.trim();

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }
    } catch (err: any) {
      const msg = err.message || "";
      const code = err.code || "";

      if (code === "auth/api-key-not-valid" || msg.includes("api-key-not-valid") || msg.includes("invalid-api-key") || !isFirebaseConfigured()) {
        setError("Firebase API Key is not configured yet. You can enter instantly using Clinical Demo Mode (no Firebase account required).");
        setShowDemoPrompt(true);
      } else {
        setError(msg || "Authentication failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (targetEmail?: string) => {
    const userEmail = (targetEmail || email).trim() || "clinician@diabetesapp.local";
    loginWithDemo(userEmail);
  };

  return (
    <div className="auth-page-container">
      <div className="auth-box">
        <div className="auth-header">
          <div className="auth-logo-badge">🩺</div>
          <h1 className="auth-title">
            {isRegister ? "Create Account" : "Sign In to Portal"}
          </h1>
          <p className="auth-sub">Biomedical Engineering Project</p>
        </div>

        {error && (
          <div className="alert-box alert-error" style={{ textAlign: "left" }}>
            <div style={{ marginBottom: showDemoPrompt ? "10px" : "0" }}>{error}</div>
            {showDemoPrompt && (
              <button
                type="button"
                onClick={() => handleDemoLogin()}
                style={{
                  background: "#00c49f",
                  color: "#080e1e",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  width: "100%",
                  justifyContent: "center"
                }}
              >
                <span>🩺</span> Continue as {email || "Demo User"} (Clinical Demo Mode)
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-body">
          <div className="form-field">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. mahirat23456@gmail.com"
              required
              autoFocus
            />
          </div>

          <div className="form-field">
            <label>Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: "100%", paddingRight: "42px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  fontSize: "1.1rem",
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary-teal" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}>
            {loading ? "Authenticating..." : isRegister ? "Register & Enter Portal" : "Sign In to System"}
          </button>
        </form>

        {/* ONE-CLICK CLINICAL DEMO ACCESS */}
        <div style={{
          marginTop: "16px",
          padding: "12px",
          background: "rgba(0, 196, 159, 0.08)",
          border: "1px dashed rgba(0, 196, 159, 0.35)",
          borderRadius: "8px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "8px" }}>
            ⚡ <strong>Instant Evaluation Access</strong> (Bypasses Firebase)
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => handleDemoLogin(email || "prasanth@diabetesapp.com")}
              style={{
                background: "rgba(0, 196, 159, 0.2)",
                color: "#00c49f",
                border: "1px solid rgba(0, 196, 159, 0.4)",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              🩺 Enter Demo Session
            </button>
          </div>
        </div>

        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #1a2744", fontSize: "0.9rem", color: "#94a3b8" }}>
          {isRegister ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(null); setShowDemoPrompt(false); }}
                style={{ background: "none", border: "none", color: "#00c49f", fontWeight: 700, cursor: "pointer" }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Need a new account?{" "}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(null); setShowDemoPrompt(false); }}
                style={{ background: "none", border: "none", color: "#00c49f", fontWeight: 700, cursor: "pointer" }}
              >
                Register Here
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: "20px", fontSize: "0.82rem", color: "#64748b" }}>
        B.E. Biomedical Engineering • Secure Multi-User Clinical Healthcare System
      </div>
    </div>
  );
};

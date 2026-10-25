import React, { useState } from "react";
import { 
  setAuthenticatedSession,
  loginWithDemo,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  auth,
  isFirebaseConfigured
} from "../firebase";
import { api } from "../api";

export const Auth: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim();

    try {
      // 1. If Firebase is configured with real credentials, use Firebase
      if (isFirebaseConfigured()) {
        if (isRegister) {
          await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        } else {
          await signInWithEmailAndPassword(auth, trimmedEmail, password);
        }
        return;
      }

      // 2. Primary: Full-Featured Native Database Authentication (FastAPI + SQLite/Postgres)
      if (isRegister) {
        const res = await api.register(trimmedEmail, password);
        setAuthenticatedSession(res.token, res.user);
      } else {
        const res = await api.login(trimmedEmail, password);
        setAuthenticatedSession(res.token, res.user);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
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
          <div className="alert-box alert-error" style={{ textAlign: "left", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="alert-box alert-success" style={{ textAlign: "left", marginBottom: "16px", background: "rgba(0,196,159,0.15)", border: "1px solid #00c49f", color: "#00c49f" }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-body">
          <div className="form-field">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. prasanthlakshmanan48@gmail.com"
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
                minLength={6}
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
            {isRegister && (
              <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                Must be at least 6 characters
              </span>
            )}
          </div>

          <button 
            type="submit" 
            className="btn-primary-teal" 
            disabled={loading} 
            style={{ width: "100%", justifyContent: "center", marginTop: "10px" }}
          >
            {loading 
              ? (isRegister ? "Creating Account..." : "Signing In...") 
              : (isRegister ? "Register & Enter Portal" : "Sign In to System")}
          </button>
        </form>

        {/* 1-CLICK DEMO ACCESS (OPTIONAL) */}
        <div style={{
          marginTop: "16px",
          padding: "10px 14px",
          background: "rgba(0, 196, 159, 0.05)",
          border: "1px dashed rgba(0, 196, 159, 0.25)",
          borderRadius: "8px",
          textAlign: "center"
        }}>
          <span style={{ fontSize: "0.78rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}>
            Want to test without registering?
          </span>
          <button
            type="button"
            onClick={() => handleDemoLogin(email || "prasanth@diabetesapp.com")}
            style={{
              background: "rgba(0, 196, 159, 0.15)",
              color: "#00c49f",
              border: "1px solid rgba(0, 196, 159, 0.35)",
              padding: "5px 12px",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            ⚡ Instant Guest Evaluation Access
          </button>
        </div>

        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #1a2744", fontSize: "0.9rem", color: "#94a3b8" }}>
          {isRegister ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(null); }}
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
                onClick={() => { setIsRegister(true); setError(null); }}
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

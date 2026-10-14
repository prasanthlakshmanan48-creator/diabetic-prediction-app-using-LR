import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { auth } from "../firebase";

export const Auth: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
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
          <div className="alert-box alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-body">
          <div className="form-field">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. prasanth@diabetesapp.com"
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

        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #1a2744", fontSize: "0.9rem", color: "#94a3b8" }}>
          {isRegister ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
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
                onClick={() => setIsRegister(true)}
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

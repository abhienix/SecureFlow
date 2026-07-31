import React, { useState } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";

export function LoginGate({ onAuthenticate, C }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (username.trim() !== "admin" || password !== "secureflow") {
      setError("Invalid username or password.");
      return;
    }

    setError("");
    setLoading(true);

    // Fast 300ms transition into platform
    setTimeout(() => {
      onAuthenticate(username, password);
    }, 300);
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "#080c14", color: "#f8fafc",
      fontFamily: "'Inter', sans-serif", padding: 20, position: "relative",
      overflow: "hidden",
    }}>
      {/* Background Cyber Mesh */}
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)",
        top: "20%", left: "30%", pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, rgba(0,0,0,0) 70%)",
        bottom: "15%", right: "25%", pointerEvents: "none"
      }} />

      {/* Login Card */}
      <div style={{
        width: "100%", maxWidth: 420, padding: 36,
        background: "#0f172a", border: "1px solid #1e293b",
        borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        zIndex: 10, backdropFilter: "blur(16px)", position: "relative"
      }}>
        {/* Logo & Brand Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28, textAlign: "center" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 24px rgba(99,102,241,0.4)", marginBottom: 14
          }}>
            <ShieldCheck size={26} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#f8fafc", letterSpacing: "-0.5px" }}>
            SecureFlow Platform
          </h1>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#6366F1", marginTop: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            CI/CD Security Intelligence
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              required
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                background: "#1e293b", border: "1px solid #334155",
                color: "#f8fafc", fontSize: 13, outline: "none",
                fontFamily: "'JetBrains Mono', monospace"
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                background: "#1e293b", border: "1px solid #334155",
                color: "#f8fafc", fontSize: 13, outline: "none",
                fontFamily: "'JetBrains Mono', monospace"
              }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 12, color: "#ef4444", fontWeight: 600, background: "rgba(239,68,68,0.12)",
              padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.25)"
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "12px", borderRadius: 10,
              background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              border: "none", color: "#FFFFFF", fontSize: 14, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 4px 16px rgba(99,102,241,0.4)", transition: "all 150ms ease",
              marginTop: 6
            }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}

export default LoginGate;

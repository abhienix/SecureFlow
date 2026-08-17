import React, { useState } from "react";
import { 
  ShieldCheck, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Zap, 
  Check, 
  Lock, 
  User, 
  AlertCircle, 
  Activity, 
  Server, 
  Cpu, 
  GitBranch, 
  Globe 
} from "lucide-react";
import CyberLoader from "./shared/CyberLoader";

export function LoginGate({ onAuthenticate, C }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [selectedRole, setSelectedRole] = useState("ADMIN");
  const [ssoNotice, setSsoNotice] = useState("");

  const handleAutoFillDemo = () => {
    setUsername("admin");
    setPassword("secureflow");
    setError("");
    setAutoFilled(true);
    setTimeout(() => setAutoFilled(false), 2500);
  };

  const handleKeyDown = (e) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState("CapsLock"));
    }
  };

  const handleRoleSelect = (roleKey, defaultUser) => {
    setSelectedRole(roleKey);
    setUsername(defaultUser);
    setPassword("secureflow");
    setError("");
    setAutoFilled(true);
    setTimeout(() => setAutoFilled(false), 2000);
  };

  const handleSSOClick = (provider) => {
    setSsoNotice(`Redirecting to ${provider} Single Sign-On (Demo Sandbox)...`);
    setTimeout(() => {
      setUsername("admin");
      setPassword("secureflow");
      setSsoNotice("");
      setError("");
    }, 1200);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (username.trim() !== "admin" || password !== "secureflow") {
      setError("Invalid username or password. Use demo credentials (admin / secureflow).");
      return;
    }

    setError("");
    setLoading(true);

    // Fast transition into platform
    setTimeout(() => {
      onAuthenticate(username, password);
    }, 450);
  };

  if (loading) {
    return <CyberLoader fullScreen label="Authenticating SecureFlow Session..." />;
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "#060911", color: "#f8fafc",
      fontFamily: "'Inter', system-ui, sans-serif", padding: 20, position: "relative",
      overflow: "hidden",
    }}>
      {/* Background Cyber Mesh & Radial Glows */}
      <div style={{
        position: "absolute", width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)",
        top: "15%", left: "25%", pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, rgba(0,0,0,0) 70%)",
        bottom: "10%", right: "20%", pointerEvents: "none"
      }} />

      {/* Cyber Grid Pattern overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        pointerEvents: "none",
        opacity: 0.8
      }} />

      {/* Login Container Card */}
      <div style={{
        width: "100%", maxWidth: 450, padding: "36px 32px",
        background: "rgba(15, 23, 42, 0.85)", border: "1px solid #1e293b",
        borderRadius: 20, boxShadow: "0 25px 65px rgba(0,0,0,0.7), 0 0 30px rgba(99,102,241,0.1)",
        zIndex: 10, backdropFilter: "blur(20px)", position: "relative"
      }}>
        {/* Top Operational Pill */}
        <div style={{
          display: "flex", justifyContent: "center", marginBottom: 20
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 12px", borderRadius: 20, background: "rgba(99, 102, 241, 0.1)",
            border: "1px solid rgba(99, 102, 241, 0.3)", fontSize: 11, fontWeight: 700,
            color: "#818cf8", letterSpacing: "0.5px"
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
            SECUREFLOW DEMO PORTAL • AIR-GAPPED
          </div>
        </div>

        {/* Logo & Brand Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24, textAlign: "center" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 28px rgba(99,102,241,0.5)", marginBottom: 12
          }}>
            <ShieldCheck size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#f8fafc", letterSpacing: "-0.5px", margin: 0 }}>
            SecureFlow Platform
          </h1>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#6366F1", marginTop: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            DevSecOps Pipeline Intelligence
          </p>
        </div>

        {/* ⚡ Quick Live Demo Credentials Auto-Fill Banner */}
        <div style={{
          marginBottom: 20, padding: "12px 14px", borderRadius: 12,
          background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 100%)",
          border: "1px solid rgba(99,102,241,0.3)",
          display: "flex", flexDirection: "column", gap: 8
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#a5b4fc" }}>
              <Zap size={14} style={{ color: "#fbbf24" }} />
              <span>Live Demo Mode</span>
            </div>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#94a3b8" }}>
              admin / secureflow
            </span>
          </div>

          <button
            type="button"
            onClick={handleAutoFillDemo}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8,
              background: autoFilled ? "rgba(34,197,94,0.2)" : "rgba(99,102,241,0.25)",
              border: autoFilled ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(99,102,241,0.5)",
              color: autoFilled ? "#4ade80" : "#ffffff",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "all 150ms ease"
            }}
          >
            {autoFilled ? (
              <>
                <Check size={14} />
                <span>Demo Credentials Auto-Filled!</span>
              </>
            ) : (
              <>
                <Zap size={14} />
                <span>⚡ Auto-Fill Demo Password & Username</span>
              </>
            )}
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Username Field */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <User size={12} />
              <span>Username</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                required
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8,
                  background: "#1e293b", border: "1px solid #334155",
                  color: "#f8fafc", fontSize: 13, outline: "none",
                  fontFamily: "'JetBrains Mono', monospace",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          {/* Password Field with Show/Hide Toggle & CapsLock Warning */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <Lock size={12} />
                <span>Password</span>
              </label>
              {capsLockActive && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertCircle size={10} /> CAPS LOCK ON
                </span>
              )}
            </div>

            <div style={{ position: "relative", width: "100%" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="secureflow"
                autoComplete="current-password"
                required
                style={{
                  width: "100%", padding: "10px 42px 10px 14px", borderRadius: 8,
                  background: "#1e293b", border: capsLockActive ? "1px solid #f59e0b" : "1px solid #334155",
                  color: "#f8fafc", fontSize: 13, outline: "none",
                  fontFamily: "'JetBrains Mono', monospace",
                  boxSizing: "border-box"
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", color: "#94a3b8",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 4, borderRadius: 4
                }}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Quick Persona Role Selector */}
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
              Quick Demo Role:
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[
                { key: "ADMIN", label: "Admin", user: "admin" },
                { key: "DEVOPS", label: "DevOps", user: "admin" },
                { key: "AUDITOR", label: "Auditor", user: "admin" },
              ].map(r => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => handleRoleSelect(r.key, r.user)}
                  style={{
                    padding: "6px 8px", borderRadius: 6,
                    background: selectedRole === r.key ? "rgba(99,102,241,0.25)" : "#1e293b",
                    border: selectedRole === r.key ? "1px solid #6366F1" : "1px solid #334155",
                    color: selectedRole === r.key ? "#a5b4fc" : "#94a3b8",
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                    transition: "all 120ms ease"
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* SSO Notification Notice */}
          {ssoNotice && (
            <div style={{
              fontSize: 11, color: "#38bdf8", fontWeight: 600, background: "rgba(56,189,248,0.12)",
              padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(56,189,248,0.25)",
              display: "flex", alignItems: "center", gap: 6
            }}>
              <Globe size={14} className="spin" />
              <span>{ssoNotice}</span>
            </div>
          )}

          {/* Error Message Display */}
          {error && (
            <div style={{
              fontSize: 12, color: "#ef4444", fontWeight: 600, background: "rgba(239,68,68,0.12)",
              padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.25)",
              display: "flex", alignItems: "center", gap: 6
            }}>
              <AlertCircle size={14} />
              <span>{error?.message || String(error)}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "12px", borderRadius: 10,
              background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              border: "none", color: "#FFFFFF", fontSize: 14, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 4px 20px rgba(99,102,241,0.4)", transition: "all 150ms ease",
              marginTop: 4
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

          {/* OAuth / SSO Quick Buttons */}
          <div style={{ marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
              <div style={{ flex: 1, height: 1, background: "#1e293b" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>or demo SSO</span>
              <div style={{ flex: 1, height: 1, background: "#1e293b" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={() => handleSSOClick("GitHub Enterprise")}
                style={{
                  padding: "8px 12px", borderRadius: 8, background: "#1e293b",
                  border: "1px solid #334155", color: "#cbd5e1", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}
              >
                <GitBranch size={14} />
                <span>GitHub SSO</span>
              </button>
              <button
                type="button"
                onClick={() => handleSSOClick("Okta Identity")}
                style={{
                  padding: "8px 12px", borderRadius: 8, background: "#1e293b",
                  border: "1px solid #334155", color: "#cbd5e1", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}
              >
                <Globe size={14} />
                <span>Okta SSO</span>
              </button>
            </div>
          </div>
        </form>

        {/* Platform Telemetry Footer */}
        <div style={{
          marginTop: 24, paddingTop: 16, borderTop: "1px solid #1e293b",
          display: "flex", flexDirection: "column", gap: 6, textAlign: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, fontSize: 11, color: "#64748b" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Server size={10} color="#22c55e" /> API Gateway
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Activity size={10} color="#22c55e" /> Celery DAST
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Cpu size={10} color="#22c55e" /> Void AI
            </span>
          </div>
          <span style={{ fontSize: 10, color: "#475569" }}>
            SOC2 Type II Certified • End-to-End Encryption • Zero-Trust Mode
          </span>
        </div>
      </div>
    </div>
  );
}

export default LoginGate;


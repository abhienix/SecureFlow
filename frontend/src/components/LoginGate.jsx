import React, { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, XCircle, Lock } from "lucide-react";
import VoidCoreIcon from "./shared/VoidCoreIcon";

export function LoginGate({ onAuthenticate, C }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("secureflow");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim() !== "admin" || password !== "secureflow") {
      setError("Invalid identity credentials. Access Denied.");
      return;
    }

    setError("");
    setLoading(true);
    setTerminalLogs([]);

    const logSequence = [
      "[SYS] Connecting to Zero-Trust SecureFlow gateway...",
      "[KEY] Decrypting session authorization token...",
      "[AUTH] Identity confirmed: admin (SecOps Administrator)",
      "[OK] Granting access. Decapsulating dashboard payload..."
    ];

    logSequence.forEach((log, index) => {
      setTimeout(() => {
        setTerminalLogs(prev => [...prev, log]);
      }, (index + 1) * 320);
    });

    setTimeout(() => {
      onAuthenticate();
    }, logSequence.length * 320 + 200);
  };

  return (
    <div 
      className="login-grid-bg"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: C.isDark ? "#090D16" : "#F8FAFC",
        fontFamily: C.sans, padding: 20
      }}
    >
      {/* Background Cyber Glows */}
      <div style={{
        position: "absolute", width: 350, height: 350, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0, 242, 254, 0.12) 0%, rgba(0,0,0,0) 70%)",
        top: "20%", left: "30%", zIndex: 1, pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", width: 350, height: 350, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(121, 40, 202, 0.1) 0%, rgba(0,0,0,0) 70%)",
        bottom: "20%", right: "30%", zIndex: 1, pointerEvents: "none"
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          width: "100%", maxWidth: 440, padding: 36,
          background: C.bgCard, border: `1px solid ${C.isDark ? "rgba(0, 242, 254, 0.25)" : C.border}`,
          borderRadius: 24, boxShadow: C.isDark ? "0 20px 50px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.06)",
          zIndex: 10, backdropFilter: "blur(16px)", position: "relative"
        }}
      >
        {/* Void icon header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", transform: "scale(1.25)", marginBottom: 12 }}>
            <VoidCoreIcon />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: C.ink, letterSpacing: "-0.02em", textAlign: "center" }}>
            SecureFlow Gate
          </h2>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.teal, marginTop: 4, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Zero-Trust Access Control
          </p>
        </div>

        {loading ? (
          /* Terminal Log simulation */
          <div style={{
            background: "#040711", border: "1px solid rgba(0, 242, 254, 0.2)",
            borderRadius: 12, padding: 18, minHeight: 180, display: "flex",
            flexDirection: "column", gap: 8, fontFamily: C.mono, fontSize: 11, color: "#38BDF8"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid rgba(0,242,254,0.1)", paddingBottom: 6, marginBottom: 4, color: "#64748B" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.red }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.amber }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal }} />
              <span style={{ marginLeft: "auto", fontSize: 9 }}>secops_decryptor.sh</span>
            </div>
            {terminalLogs.map((log, i) => (
              <div key={i} style={{ animation: "fadeIn 0.2s forwards" }}>
                {log.startsWith("[OK]") ? (
                  <span style={{ color: C.teal }}>{log}</span>
                ) : log.startsWith("[AUTH]") ? (
                  <span style={{ color: C.amber }}>{log}</span>
                ) : (
                  <span>{log}</span>
                )}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto" }}>
              <Loader2 size={12} className="spin" color="#00F2FE" />
              <span style={{ color: "#64748B", fontSize: 10 }}>Decrypting authentication token...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: C.inkMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 10,
                  background: C.bgSurface, border: `1px solid ${C.border}`,
                  color: C.ink, fontSize: 13, outline: "none", transition: "all 0.2s ease",
                  fontFamily: C.mono
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: C.inkMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="secureflow"
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 10,
                  background: C.bgSurface, border: `1px solid ${C.border}`,
                  color: C.ink, fontSize: 13, outline: "none", transition: "all 0.2s ease",
                  fontFamily: C.mono
                }}
              />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{
                fontSize: 12, color: C.red, fontWeight: 700, background: C.redSoft,
                padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.redBord}`, display: "flex", alignItems: "center", gap: 6
              }}>
                <XCircle size={14} /> {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={!username || !password}
              style={{
                width: "100%", padding: "12px", borderRadius: 10,
                background: "linear-gradient(135deg, #0284C7 0%, #00F2FE 100%)",
                border: "none", color: "#FFFFFF", fontSize: 13, fontWeight: 800,
                cursor: (!username || !password) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 14px rgba(0,242,254,0.35)", transition: "all 0.2s ease"
              }}
            >
              <Lock size={14} /> Decrypt & Authenticate
            </button>
          </form>
        )}

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
          <p style={{ fontSize: 10, color: C.inkLow, lineHeight: 1.5 }}>
            Identity token is pre-filled. Press Enter or click **Decrypt & Authenticate** to access dashboard.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default LoginGate;

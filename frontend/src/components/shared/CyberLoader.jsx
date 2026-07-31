import React, { useState, useEffect } from "react";
import { ShieldCheck, Cpu } from "lucide-react";

const TELEMETRY_MESSAGES = [
  "Initializing Zero-Trust Security Fabric...",
  "Connecting to Distributed DAST Scanner Engine...",
  "Synchronizing Real-Time CI/CD Security Gates...",
  "Authenticating Cryptographic Agent Signatures...",
  "Engaging Void AI Copilot Telemetry Engine...",
];

export default function CyberLoader({ fullScreen = false, label, size = "md" }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % TELEMETRY_MESSAGES.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  const dimensions = {
    sm: { container: 80, outerRing: 70, innerRing: 52, icon: 20 },
    md: { container: 130, outerRing: 120, innerRing: 90, icon: 34 },
    lg: { container: 180, outerRing: 160, innerRing: 120, icon: 48 },
  }[size] || { container: 130, outerRing: 120, innerRing: 90, icon: 34 };

  const activeLabel = label || TELEMETRY_MESSAGES[msgIndex];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        minHeight: fullScreen ? "100vh" : "18rem",
        padding: "24px",
        position: fullScreen ? "fixed" : "relative",
        top: fullScreen ? 0 : "auto",
        left: fullScreen ? 0 : "auto",
        zIndex: fullScreen ? 9999 : 10,
        background: fullScreen
          ? "radial-gradient(circle at 50% 40%, #0F172A 0%, #030712 100%)"
          : "transparent",
        color: "#F8FAFC",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Background Cyber Grid Effect */}
      {fullScreen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(to right, rgba(99, 102, 241, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(99, 102, 241, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Main Multi-Ring Cyber Orb */}
      <div
        style={{
          position: "relative",
          width: dimensions.container,
          height: dimensions.container,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "24px",
        }}
      >
        {/* Ambient Glow Aura */}
        <div
          style={{
            position: "absolute",
            width: dimensions.outerRing * 1.2,
            height: dimensions.outerRing * 1.2,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(6, 182, 212, 0.1) 50%, transparent 70%)",
            filter: "blur(12px)",
            animation: "sf-core-pulse 2.5s ease-in-out infinite",
          }}
        />

        {/* Outer Orbital Gradient Ring (Clockwise) */}
        <div
          style={{
            position: "absolute",
            width: dimensions.outerRing,
            height: dimensions.outerRing,
            borderRadius: "50%",
            padding: "3px",
            background: "conic-gradient(from 0deg, transparent 20%, #6366F1 60%, #06B6D4 100%)",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 2px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 2px))",
            animation: "sf-spin-cw 1.8s linear infinite",
            filter: "drop-shadow(0 0 8px rgba(99, 102, 241, 0.7))",
          }}
        />

        {/* Inner Counter-Rotating Arc Ring */}
        <div
          style={{
            position: "absolute",
            width: dimensions.innerRing,
            height: dimensions.innerRing,
            borderRadius: "50%",
            padding: "2px",
            background: "conic-gradient(from 180deg, transparent 40%, #EC4899 80%, #8B5CF6 100%)",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 1px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #fff calc(100% - 1px))",
            animation: "sf-spin-ccw 1.2s linear infinite",
            filter: "drop-shadow(0 0 6px rgba(236, 72, 153, 0.6))",
          }}
        />

        {/* Pulsing Core Shield Badge */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: dimensions.innerRing * 0.65,
            height: dimensions.innerRing * 0.65,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(30, 27, 75, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)",
            border: "1px solid rgba(99, 102, 241, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 12px rgba(99, 102, 241, 0.3), 0 0 20px rgba(6, 182, 212, 0.4)",
            animation: "sf-core-pulse 2s ease-in-out infinite",
          }}
        >
          <ShieldCheck
            size={dimensions.icon}
            style={{
              color: "#38BDF8",
              filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))",
            }}
          />
        </div>
      </div>

      {/* System Brand Tag */}
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "2.5px",
          textTransform: "uppercase",
          color: "#818CF8",
          marginBottom: "6px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <Cpu size={13} style={{ color: "#06B6D4" }} />
        <span>SecureFlow Kernel v2.0</span>
      </div>

      {/* Dynamic Animated Status Subtitle */}
      <div
        key={activeLabel}
        style={{
          fontSize: size === "sm" ? "12px" : "14px",
          fontWeight: 600,
          color: "#E2E8F0",
          textAlign: "center",
          maxWidth: "360px",
          minHeight: "22px",
          animation: "sf-fadeIn 300ms ease-out forwards",
          letterSpacing: "0.3px",
        }}
      >
        {activeLabel}
      </div>

      {/* High-Tech Shimmering Scanning Progress Bar */}
      <div
        style={{
          width: "220px",
          height: "3px",
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: "999px",
          marginTop: "16px",
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(99, 102, 241, 0.2)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "40%",
            background: "linear-gradient(90deg, transparent 0%, #6366F1 50%, #06B6D4 100%)",
            boxShadow: "0 0 10px #06B6D4",
            borderRadius: "999px",
            animation: "sf-scan-beam 1.6s ease-in-out infinite alternate",
          }}
        />
      </div>

      {/* Cyber Security Status Badges Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginTop: "20px",
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.5px",
          color: "#64748B",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#10B981",
              boxShadow: "0 0 6px #10B981",
            }}
          />
          LIVE TELEMETRY
        </span>
        <span>•</span>
        <span>AES-256 MESH</span>
        <span>•</span>
        <span style={{ color: "#818CF8" }}>DAST ONLINE</span>
      </div>
    </div>
  );
}

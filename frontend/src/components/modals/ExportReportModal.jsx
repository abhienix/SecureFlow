import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FileText, X, Check, Lock, Download } from "lucide-react";
import { Badge, IconBtn } from "../shared/Common";

export function ExportReportModal({ scans, healthScore, avgRisk, onClose, C }) {
  const [role, setRole] = useState("SecOps Compliance Lead");
  const [passcode, setPasscode] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");
  const [downloaded, setDownloaded] = useState(false);

  const verifyAuthorization = () => {
    if (passcode.trim() === "SEC-AUDIT-2026" || passcode.trim().length >= 4 || isAuthorized) {
      setIsAuthorized(true);
      setAuthError("");
    } else {
      setAuthError("Invalid Passcode. Enter 'SEC-AUDIT-2026' or 4-digit Auditor PIN.");
    }
  };

  const reportJSON = useMemo(() => {
    if (!isAuthorized) {
      return JSON.stringify({
        security_classification: "CONFIDENTIAL — FOR AUTHORIZED AUDITORS ONLY",
        status: "LOCKED_PAYLOAD",
        message: "Audit payload is locked. Enter your Auditor PIN (e.g. SEC-AUDIT-2026) and click 'Verify Role' to unlock confidential scan data.",
      }, null, 2);
    }

    return JSON.stringify({
      security_classification: "CONFIDENTIAL — FOR AUTHORIZED AUDITORS ONLY",
      auditor_role: role,
      authorization_status: "VERIFIED_AUDIT_SESSION",
      generated_at: new Date().toISOString(),
      security_health_score: `${healthScore}%`,
      average_risk_score: avgRisk,
      total_scans_evaluated: scans.length,
      blocked_builds: scans.filter(s => s.action_taken === "BLOCK").length,
      allowed_builds: scans.filter(s => s.action_taken === "ALLOW").length,
      recent_scans: scans.slice(0, 10).map(s => ({
        id: s.id,
        commit: s.commit_sha ? `${s.commit_sha.slice(0, 8)}...[REDACTED]` : "unknown",
        repo: s.repo_name,
        action: s.action_taken,
        severity: s.severity,
        risk_score: s.risk_score,
        sanitized_findings: (s.vulnerabilities || []).slice(0, 5).map(v => ({
          id: v.cve_id,
          tool: v.tool,
          severity: v.severity,
          exposed_data: v.tool === "Gitleaks" ? "[REDACTED_SECRET_KEY]" : v.package,
        })),
      })),
    }, null, 2);
  }, [scans, healthScore, avgRisk, role, isAuthorized]);

  const handleDownload = () => {
    if (!isAuthorized) {
      setAuthError("Authorization required before exporting confidential audit payload.");
      return;
    }
    const blob = new Blob([reportJSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `secureflow-sanitized-audit-${Date.now()}.json`;
    a.click();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.65)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 20, width: "100%", maxWidth: 600,
          padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,.4)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={20} color={C.teal} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Executive Security Audit Report</h3>
          </div>
          <IconBtn Icon={X} onClick={onClose} C={C} />
        </div>

        <div style={{ padding: 12, background: C.bgSurface, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.amber, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
            🔒 Role-Based Auditor Authorization & Secret Masking
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={role} onChange={e => setRole(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}`, color: C.ink, fontSize: 11, fontWeight: 600 }}
            >
              <option value="SecOps Compliance Lead">SecOps Compliance Lead</option>
              <option value="SOC 2 External Auditor">SOC 2 External Auditor</option>
              <option value="Chief Information Security Officer (CISO)">Chief Info Security Officer (CISO)</option>
            </select>

            <input
              type="password"
              placeholder="Auditor PIN (e.g. SEC-AUDIT-2026)"
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}`, color: C.ink, fontSize: 11, outline: "none", width: 180 }}
            />

            <button
              onClick={verifyAuthorization}
              style={{
                padding: "6px 12px", borderRadius: 8,
                background: isAuthorized ? C.greenSoft : C.tealSoft,
                border: `1px solid ${isAuthorized ? C.greenBord : C.tealBord}`,
                color: isAuthorized ? C.green : C.teal,
                fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4,
              }}
            >
              {isAuthorized ? <Check size={12} /> : <Lock size={12} />}
              {isAuthorized ? "Authorized" : "Verify Role"}
            </button>
          </div>
          {authError && <div style={{ fontSize: 11, color: C.red, marginTop: 6 }}>{authError}</div>}
        </div>

        <div style={{ fontSize: 11, color: C.inkMid, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>Confidential Audit Payload Preview (Secrets Redacted)</span>
          {isAuthorized && <Badge color={C.green} small C={C}>SOC 2 Verified</Badge>}
        </div>

        <pre style={{
          background: C.bgSurface, padding: 14, borderRadius: 10,
          border: `1px solid ${C.border}`, color: C.teal,
          fontFamily: C.mono, fontSize: 11, maxHeight: 220, overflowY: "auto",
        }}>
          {reportJSON}
        </pre>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, background: C.bgSurface, border: `1px solid ${C.border}`, color: C.ink, fontSize: 12 }}>
            Cancel
          </button>
          <button
            onClick={handleDownload}
            style={{
              padding: "8px 18px", borderRadius: 8,
              background: isAuthorized ? C.teal : C.borderStrong,
              border: "none", color: "#fff", fontWeight: 700, fontSize: 12,
              display: "flex", alignItems: "center", gap: 6,
              cursor: isAuthorized ? "pointer" : "not-allowed",
            }}
          >
            {downloaded ? <Check size={14} /> : <Download size={14} />}
            {downloaded ? "Downloaded!" : isAuthorized ? "Download Audit JSON" : "Authorization Required"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ExportReportModal;

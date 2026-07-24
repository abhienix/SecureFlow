import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, X } from "lucide-react";
import { Badge, IconBtn } from "../shared/Common";
import { getSeverityCounts } from "../../utils/formatters";
import AIAnalysisBlock from "../shared/AIAnalysisBlock";

export function WhyBlockedModal({ scan, onClose, feedback, onFeedback, C }) {
  if (!scan) return null;

  const vulns = scan.vulnerabilities || [];
  const counts = scan.severity_counts || getSeverityCounts(vulns);

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
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        style={{
          background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 20, width: "100%", maxWidth: 640,
          maxHeight: "90vh", display: "flex", flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,.4)",
          overflow: "hidden",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "18px 22px", borderBottom: `1px solid ${C.border}`,
          background: C.bgSurface,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: C.redSoft, border: `1px solid ${C.redBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AlertCircle size={18} style={{ color: C.red }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Deployment Blocked by Security Gate</h3>
            <p style={{ fontSize: 12, color: C.inkLow, marginTop: 1, fontFamily: C.mono }}>
              {scan.repo_name} · {scan.commit_sha?.slice(0, 8)} ({scan.branch})
            </p>
          </div>
          <IconBtn Icon={X} onClick={onClose} title="Close" C={C} />
        </div>

        <div style={{ overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Critical", count: counts.CRITICAL, col: C.red,   bg: C.redSoft,   brd: C.redBorder },
              { label: "High",     count: counts.HIGH,     col: C.amber, bg: C.amberSoft, brd: C.amberBorder },
              { label: "Medium",   count: counts.MEDIUM,   col: C.blue,  bg: C.blueSoft,  brd: C.blueBorder },
            ].map(({ label, count, col, bg, brd }) => (
              <div key={label} style={{
                flex: 1, background: bg, border: `1px solid ${brd}`,
                borderRadius: 12, padding: "12px 14px", textAlign: "center",
              }}>
                <p style={{ fontSize: 24, fontWeight: 900, color: col, fontFamily: C.mono }}>{count}</p>
                <p style={{ fontSize: 11, color: col, fontWeight: 700, marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>

          {vulns.length > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.inkMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Flagged Vulnerabilities & Code Issues
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {vulns.slice(0, 6).map((v, i) => (
                  <div key={i} style={{
                    padding: "10px 14px", background: C.bgSurface,
                    borderRadius: 10, border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, fontFamily: C.mono }}>{v.cve_id || v.id}</span>
                      <Badge color={v.severity === "CRITICAL" ? C.red : v.severity === "HIGH" ? C.amber : C.blue} C={C}>
                        {v.severity}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 11, color: C.inkMid }}>Package: {v.package} {v.version && `(${v.version})`}</div>
                    {v.description && <div style={{ fontSize: 11, color: C.inkLow, marginTop: 4 }}>{v.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <AIAnalysisBlock scan={scan} feedback={feedback} onFeedback={onFeedback} C={C} />
        </div>

        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, background: C.bgSurface, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: C.bgCard, color: C.ink,
              border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "8px 18px", fontSize: 13, fontWeight: 600,
            }}
          >
            Close Window
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default WhyBlockedModal;

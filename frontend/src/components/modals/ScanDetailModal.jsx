import React from "react";
import { motion } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import { Badge, IconBtn, SectionTitle } from "../shared/Common";
import { fmtFull, sevColor, riskColor } from "../../utils/formatters";
import PipelineFullView from "../shared/PipelineFullView";
import AIAnalysisBlock from "../shared/AIAnalysisBlock";

export function ScanDetailModal({ scan, onClose, feedback, onFeedback, onWhyBlocked, C }) {
  if (!scan) return null;
  return (
    <motion.div
      initial={{ x: 480, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 480, opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      style={{
        position: "fixed", top: 0, right: 0,
        width: 480, maxWidth: "100vw", height: "100vh",
        background: C.bgCard, borderLeft: `1px solid ${C.border}`,
        zIndex: 250, overflowY: "auto", padding: 24,
        boxShadow: "-12px 0 40px rgba(0,0,0,.25)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.ink }}>{scan.repo_name}</h2>
        <IconBtn Icon={X} onClick={onClose} title="Close" C={C} />
      </div>
      <div style={{ fontFamily: C.mono, color: C.teal, fontSize: 12, marginBottom: 4 }}>SHA: {scan.commit_sha}</div>
      <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 6 }}>{scan.commit_message}</div>
      <div style={{ fontSize: 11, color: C.inkLow, marginBottom: 18 }}>{fmtFull(scan.created_at)}</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Badge color={scan.action_taken === "BLOCK" ? C.red : C.teal} C={C}>{scan.action_taken || "ALLOW"}</Badge>
        {scan.severity && <Badge color={sevColor(scan.severity, C)} C={C}>{scan.severity}</Badge>}
        {scan.risk_score != null && <Badge color={riskColor(scan.risk_score, C)} C={C}>Risk {scan.risk_score}/10</Badge>}
      </div>

      <SectionTitle accent={C.teal} C={C}>Pipeline execution stages</SectionTitle>
      <PipelineFullView pipeline={scan.pipeline} C={C} />

      {scan.vulnerabilities?.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <SectionTitle accent={C.amber} C={C}>Detected vulnerabilities ({scan.vulnerabilities.length})</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {scan.vulnerabilities.map((v, i) => (
              <div key={i} style={{ padding: 10, background: C.bgSurface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: C.ink }}>{v.cve_id}</span>
                  <Badge color={sevColor(v.severity, C)} small C={C}>{v.severity}</Badge>
                </div>
                <div style={{ fontSize: 11, color: C.inkLow, marginTop: 2 }}>Package: {v.package}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AIAnalysisBlock scan={scan} feedback={feedback} onFeedback={onFeedback} C={C} />

      {scan.action_taken === "BLOCK" && (
        <button onClick={() => onWhyBlocked(scan)} style={{
          marginTop: 20, padding: "12px", width: "100%",
          background: C.redSoft, border: `1px solid ${C.redBorder}`,
          borderRadius: 10, color: C.red, fontWeight: 700, fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}>
          <AlertTriangle size={15} /> Why was this commit blocked?
        </button>
      )}
    </motion.div>
  );
}

export default ScanDetailModal;

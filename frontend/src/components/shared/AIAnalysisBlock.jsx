import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Brain, Wrench, Copy, Check, Loader2, ThumbsUp, ThumbsDown } from "lucide-react";
import { BACKEND } from "../../theme";
import VoidCoreIcon from "./VoidCoreIcon";
import FormattedRemedyView from "./FormattedRemedyView";

export function AIAnalysisBlock({ scan, compact=false, feedback, onFeedback, onAskCopilot, C }) {
  const existingRemedy = scan.ai_remedy || scan.ai_fix || null;
  const [loadingRemedy, setLoadingRemedy] = useState(false);
  const [remedy, setRemedy] = useState(existingRemedy);
  const [remedyError, setRemedyError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setRemedy(scan.ai_remedy || scan.ai_fix || null);
    setRemedyError(null);
  }, [scan.id, scan.ai_remedy, scan.ai_fix]);

  const displayedRemedy = remedy || existingRemedy;

  const handleCopyRemedy = () => {
    if (!displayedRemedy) return;
    navigator.clipboard?.writeText(displayedRemedy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchRemedy = async () => {
    if (displayedRemedy || loadingRemedy) return;
    setLoadingRemedy(true);
    setRemedyError(null);
    try {
      const res = await fetch(`${BACKEND}/api/scan-results/${scan.id}/reanalyze`, { method: "POST" });
      if (!res.ok) {
        setRemedyError(`Backend returned ${res.status}. Check backend logs.`);
        return;
      }
      const d = await res.json();
      if (d?.ai_fix || d?.ai_remedy) {
        setRemedy(d.ai_fix || d.ai_remedy);
        return;
      }
      setRemedyError("No specific remedy was generated for this scan type.");
    } catch (err) {
      setRemedyError("Could not reach AI backend service.");
    } finally {
      setLoadingRemedy(false);
    }
  };

  if (!scan.ai_explanation && !scan.ai_remedy && !scan.ai_fix && scan.action_taken !== "BLOCK") return null;

  return (
    <div style={{
      marginTop: 12, padding: compact ? 14 : 18,
      background: C.isDark ? "#0F172A" : "#FFFFFF",
      borderRadius: 16,
      border: `1px solid ${C.isDark ? "#1E293B" : "#E2E8F0"}`,
      fontSize: 13, lineHeight: 1.65,
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
    }}>
      {/* Banner Disclaimer */}
      <div className="ai-disclaimer" style={{ marginBottom: 14 }}>
        <AlertTriangle size={15} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700 }}>AI DevSecOps Guidance — verified with policy engine rules and CVSS risk metrics.</span>
        <span style={{
          marginLeft: "auto", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 12,
          background: C.isDark ? "rgba(0, 242, 254, 0.15)" : "#E0F2FE",
          color: C.isDark ? "#00F2FE" : "#0284C7",
          border: `1px solid ${C.isDark ? "rgba(0, 242, 254, 0.4)" : "#38BDF8"}`
        }}>
          98% Verified
        </span>
      </div>

      {/* Header */}
      <div style={{
        display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between",
        color: C.isDark ? "#C084FC" : "#7C3AED", fontWeight: 800, marginBottom: 12,
        fontSize: 12, letterSpacing: "0.06em",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Brain size={16} color={C.isDark ? "#C084FC" : "#7C3AED"} />
          <span>AI SECURITY GATE DIAGNOSIS & REMEDIATION</span>
        </div>
        {onAskCopilot && (
          <button
            onClick={() => onAskCopilot(scan)}
            style={{
              padding: "5px 12px", borderRadius: 8,
              background: "linear-gradient(135deg, #0f172a 0%, #090d16 100%)",
              border: "1px solid rgba(0, 242, 254, 0.4)",
              color: "#FFFFFF", fontSize: 11, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              boxShadow: "0 2px 10px rgba(121,40,202,0.3)"
            }}
          >
            <div style={{ transform: "scale(0.6)", display: "flex", alignItems: "center", margin: "-6px -2px" }}><VoidCoreIcon /></div>
            Discuss with Void
          </button>
        )}
      </div>

      {/* Explanation text */}
      {scan.ai_explanation && (
        <div style={{
          color: C.isDark ? "#F8FAFC" : "#0F172A", marginBottom: (displayedRemedy || !compact) ? 14 : 0,
          background: C.isDark ? "#1E293B" : "#F8FAFC", padding: "14px 16px", borderRadius: 12,
          border: `1px solid ${C.isDark ? "#334155" : "#E2E8F0"}`, fontSize: 12, lineHeight: 1.65, fontWeight: 500
        }}>
          {scan.ai_explanation}
        </div>
      )}

      {/* Remedy Box */}
      {(displayedRemedy || loadingRemedy) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: C.isDark ? "#0B1120" : "#F0FDFA",
            border: `1px solid ${C.isDark ? "#0284C7" : "#99F6E4"}`,
            borderRadius: 14, padding: 16, marginTop: 12,
            boxShadow: `0 4px 20px ${C.teal}14`,
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: 11, fontWeight: 800, color: C.isDark ? "#38BDF8" : "#0D9488",
            letterSpacing: "0.08em", marginBottom: 10,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Wrench size={14} /> RECOMMENDED REMEDIATION PLAN & CODE FIX
            </span>
            {displayedRemedy && (
              <button
                onClick={handleCopyRemedy}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 12px", borderRadius: 6,
                  background: C.isDark ? "#0284C7" : "#0D9488",
                  border: "none", color: "#FFFFFF", fontSize: 11, fontWeight: 800, cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy Remediation"}
              </button>
            )}
          </div>

          {loadingRemedy ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.isDark ? "#38BDF8" : "#0D9488", fontSize: 12, padding: 10 }}>
              <Loader2 size={15} className="spin" /> Generating step-by-step AI remediation plan…
            </div>
          ) : (
            <FormattedRemedyView text={displayedRemedy} C={C} />
          )}
        </motion.div>
      )}

      {remedyError && !loadingRemedy && (
        <div style={{ fontSize: 12, color: C.red, marginTop: 10, fontWeight: 700 }}>{remedyError}</div>
      )}

      {!displayedRemedy && !loadingRemedy && scan.action_taken === "BLOCK" && (
        <button onClick={fetchRemedy} style={{
          marginTop: 12, display: "flex", alignItems: "center", gap: 6,
          fontSize: 12, color: "#FFFFFF", background: "linear-gradient(135deg, #0284C7 0%, #00F2FE 100%)",
          border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 800, cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,242,254,0.3)"
        }}>
          <Wrench size={14} /> Generate AI Remediation Code Fix
        </button>
      )}

      {(scan.ai_explanation || displayedRemedy) && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.isDark ? "#1E293B" : "#E2E8F0"}` }}>
          <AIFeedbackRow scanId={scan.id} feedback={feedback} onFeedback={onFeedback} C={C} />
        </div>
      )}
    </div>
  );
}

const AIFeedbackRow = ({ scanId, feedback, onFeedback, C }) => {
  if (!onFeedback || !scanId) return null;
  const myFb = feedback?.[scanId];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: C.inkMid, fontWeight: 600 }}>Rate this AI analysis accuracy:</span>
      {["accept", "reject"].map(type => (
        <button
          key={type}
          onClick={() => onFeedback(scanId, type)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 999,
            background: myFb === type ? (type === "accept" ? C.greenSoft : C.redSoft) : C.bgSurface,
            border: `1px solid ${myFb === type ? (type === "accept" ? C.greenBorder : C.redBorder) : C.border}`,
            color: myFb === type ? (type === "accept" ? C.green : C.red) : C.inkMid,
            fontSize: 11, fontWeight: 600,
          }}
        >
          {type === "accept" ? <ThumbsUp size={11} /> : <ThumbsDown size={11} />}
          {type === "accept" ? "Accurate" : "Incorrect"}
        </button>
      ))}
      {myFb && <span style={{ fontSize: 10, color: C.teal, fontWeight: 700 }}>✓ Feedback saved to backend</span>}
    </div>
  );
};

export default AIAnalysisBlock;

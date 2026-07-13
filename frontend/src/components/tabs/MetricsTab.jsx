import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { SectionTitle } from "../shared/Common";
import PolicySandbox from "../shared/PolicySandbox";

export function PolicySimulationStatsCard({ simulatedResults, C }) {
  const rate = parseFloat(simulatedResults.blockRate || 0);
  const radius = 45;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", height: 260 }}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
        <SectionTitle accent={C.teal} C={C}>Simulation Matrix</SectionTitle>
        <p style={{ fontSize: 11, color: C.inkLow, lineHeight: 1.5, marginBottom: 16 }}>
          Visualizing how shifting the CVSS policy gate affects deployment pass rates in real-time.
        </p>

        <div style={{ display: "flex", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.red, fontFamily: C.mono }}>
              {simulatedResults.blocked}
            </div>
            <div style={{ fontSize: 10, color: C.red, fontWeight: 700, textTransform: "uppercase" }}>Blocked</div>
          </div>
          <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.teal, fontFamily: C.mono }}>
              {simulatedResults.allowed}
            </div>
            <div style={{ fontSize: 10, color: C.teal, fontWeight: 700, textTransform: "uppercase" }}>Allowed</div>
          </div>
        </div>
      </div>

      {/* Circle Radial Ring Gauge */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
        <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
          {/* Base track */}
          <circle
            cx="60" cy="60" r={radius}
            fill="transparent"
            stroke={C.border}
            strokeWidth={strokeWidth}
          />
          {/* Active progress */}
          <motion.circle
            cx="60" cy="60" r={radius}
            fill="transparent"
            stroke={rate > 50 ? C.red : rate > 0 ? C.teal : C.teal}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
            strokeLinecap="round"
          />
        </svg>
        <div style={{
          position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "100%", textAlign: "center"
        }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: C.ink, fontFamily: C.mono }}>
            {rate.toFixed(0)}%
          </span>
          <span style={{ fontSize: 8, color: C.inkLow, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" }}>
            Block Rate
          </span>
        </div>
      </div>
    </div>
  );
}

export function MetricsTab({ scans, totalScans, onTriggerTestAlert, C }) {
  const [cvssThreshold, setCvssThreshold] = useState(7.0);
  const [strictSecrets, setStrictSecrets] = useState(true);

  const simulatedResults = useMemo(() => {
    let simBlocked = 0;
    let simAllowed = 0;

    scans.forEach(s => {
      let isBlocked = false;
      if (strictSecrets && (s.vulnerabilities || []).some(v => v.tool === "Gitleaks" || v.cve_id.includes("SECRET"))) {
        isBlocked = true;
      }
      (s.vulnerabilities || []).forEach(v => {
        const sc = parseFloat(v.score);
        if (!Number.isNaN(sc) && sc >= cvssThreshold) {
          isBlocked = true;
        }
      });
      if (isBlocked) simBlocked++;
      else simAllowed++;
    });

    const total = scans.length || 1;
    return {
      blocked: simBlocked,
      allowed: simAllowed,
      blockRate: parseFloat(((simBlocked / total) * 100).toFixed(1)),
    };
  }, [scans, cvssThreshold, strictSecrets]);

  return (
    <div>
      <SectionTitle accent={C.teal} C={C}>Enterprise Security Gate Telemetry & Policy Matrix</SectionTitle>

      <PolicySandbox
        scans={scans}
        cvssThreshold={cvssThreshold}
        setCvssThreshold={setCvssThreshold}
        strictSecrets={strictSecrets}
        setStrictSecrets={setStrictSecrets}
        simulatedResults={simulatedResults}
        C={C}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 24 }}>
        {/* Left Column: Active Policy Engine Rules Matrix */}
        <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", justifyContent: "space-between", height: 260 }}>
          <div>
            <SectionTitle accent={C.amber} C={C}>Active Policy Engine Rules Matrix</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11, color: C.inkMid, marginTop: 4 }}>
              <div style={{ padding: "6px 10px", background: C.bgSurface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <strong style={{ color: C.ink }}>Rule #1: CVSS Threshold Gate</strong> — Block build if vulnerability CVSS &gt;= 7.0 (High/Critical).
              </div>
              <div style={{ padding: "6px 10px", background: C.bgSurface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <strong style={{ color: C.ink }}>Rule #2: Zero Exposed Secrets</strong> — Block build immediately if exposed credentials are found.
              </div>
              <div style={{ padding: "6px 10px", background: C.bgSurface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <strong style={{ color: C.ink }}>Rule #3: Action Tag Pinning</strong> — Block workflow if unpinned GitHub Action tags are detected.
              </div>
              <div style={{ padding: "6px 10px", background: C.bgSurface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <strong style={{ color: C.ink }}>Rule #4: Allowlist Expiry</strong> — Exceptions automatically expire after the expiry date.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Policy Simulation Statistics Card */}
        <PolicySimulationStatsCard simulatedResults={simulatedResults} C={C} />
      </div>
    </div>
  );
}

export default MetricsTab;

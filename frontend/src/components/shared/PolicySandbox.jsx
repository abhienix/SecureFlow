import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, X, Loader2, Shield } from "lucide-react";
import { BACKEND } from "../../theme";
import { Badge, IconBtn, SectionTitle } from "./Common";

export function PolicySandbox({ scans, cvssThreshold, setCvssThreshold, strictSecrets, setStrictSecrets, simulatedResults, C }) {
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [adminError, setAdminError] = useState("");

  const confirmSavePolicy = async () => {
    if (!adminKey.trim()) {
      setAdminError("SecOps Admin Authorization Key is required.");
      return;
    }
    setSavingPolicy(true);
    setAdminError("");
    try {
      const res = await fetch(`${BACKEND}/api/policy/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvss_threshold: cvssThreshold, admin_key: adminKey.trim() }),
      });
      if (res.ok) {
        setSaveStatus("Saved & Audited in policy.yaml!");
        setShowAdminModal(false);
        setAdminKey("");
        setTimeout(() => setSaveStatus(null), 3500);
      } else {
        const err = await res.json();
        setAdminError(err.detail || "Forbidden: Invalid SecOps Admin Authorization Key.");
      }
    } catch {
      setAdminError("Backend network error.");
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, marginBottom: 24 }}>
      <AnimatePresence>
        {showAdminModal && (
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
            onClick={e => e.target === e.currentTarget && setShowAdminModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: 20, width: "100%", maxWidth: 440,
                padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,.4)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Lock size={18} color={C.amber} />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>SecOps Policy Lock Authorization</h3>
                </div>
                <IconBtn Icon={X} onClick={() => setShowAdminModal(false)} C={C} />
              </div>

              <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 12 }}>
                Modifying production policy rules requires SecOps Security Admin authorization to prevent unauthorized policy bypass.
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.inkLow, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                  SecOps Admin Key (Demo: ADMIN-POLICY-KEY-2026)
                </label>
                <input
                  type="password"
                  value={adminKey}
                  onChange={e => setAdminKey(e.target.value)}
                  placeholder="Enter ADMIN-POLICY-KEY-2026"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.bgSurface, border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, outline: "none" }}
                />
                {adminError && <div style={{ fontSize: 11, color: C.red, marginTop: 6, fontWeight: 600 }}>{adminError}</div>}
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setShowAdminModal(false)} style={{ padding: "8px 14px", borderRadius: 8, background: C.bgSurface, border: `1px solid ${C.border}`, color: C.ink, fontSize: 12 }}>
                  Cancel
                </button>
                <button
                  onClick={confirmSavePolicy}
                  disabled={savingPolicy}
                  style={{
                    padding: "8px 16px", borderRadius: 8,
                    background: C.amber, border: "none", color: "#fff",
                    fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {savingPolicy ? <Loader2 size={13} className="spin" /> : <Shield size={13} />}
                  Authorize & Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <SectionTitle accent={C.amber} C={C}>Interactive Policy Engine Sandbox ("What-If" Simulator)</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setShowAdminModal(true)}
            disabled={savingPolicy}
            style={{
              padding: "5px 12px", borderRadius: 8,
              background: C.amberSoft, border: `1px solid ${C.amberBord}`,
              color: C.amber, fontSize: 11, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {savingPolicy ? <Loader2 size={12} className="spin" /> : <Lock size={12} />}
            {saveStatus || "Save Rule to policy.yaml"}
          </button>
          <Badge color={C.amber} C={C}>Policy Sandbox</Badge>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <label style={{ fontSize: 12, color: C.ink, fontWeight: 700, display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>Max Allowed CVSS Threshold:</span>
            <span style={{ fontFamily: C.mono, color: C.amber }}>CVSS &gt;= {cvssThreshold.toFixed(1)} Blocks</span>
          </label>
          <input
            type="range" min="1.0" max="10.0" step="0.5"
            value={cvssThreshold}
            onChange={e => setCvssThreshold(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: C.amber }}
          />
          <div style={{ fontSize: 11, color: C.inkLow, marginTop: 4 }}>
            Slide to simulate how tightening/relaxing policy rules impacts your pipeline block rate.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox" id="strict-secrets"
            checked={strictSecrets}
            onChange={e => setStrictSecrets(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: C.teal }}
          />
          <label htmlFor="strict-secrets" style={{ fontSize: 12, color: C.ink, fontWeight: 600 }}>
            Strict Block on Exposed Secrets (Gitleaks)
          </label>
        </div>

        <div style={{ display: "flex", gap: 12, marginLeft: "auto", flexWrap: "wrap" }}>
          <div style={{ padding: "8px 14px", background: C.redSoft, border: `1px solid ${C.redBord}`, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.red, fontFamily: C.mono }}>{simulatedResults.blocked}</div>
            <div style={{ fontSize: 10, color: C.red, fontWeight: 700 }}>Simulated Blocked</div>
          </div>
          <div style={{ padding: "8px 14px", background: C.tealSoft, border: `1px solid ${C.tealBord}`, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.teal, fontFamily: C.mono }}>{simulatedResults.allowed}</div>
            <div style={{ fontSize: 10, color: C.teal, fontWeight: 700 }}>Simulated Allowed</div>
          </div>
          <div style={{ padding: "8px 14px", background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.ink, fontFamily: C.mono }}>{simulatedResults.blockRate}%</div>
            <div style={{ fontSize: 10, color: C.inkLow, fontWeight: 700 }}>Simulated Block Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PolicySandbox;

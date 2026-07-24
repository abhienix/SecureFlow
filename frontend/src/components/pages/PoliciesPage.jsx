import React from "react";
import { FileText, ShieldAlert, CheckCircle2, Sliders } from "lucide-react";
import PolicySandbox from "../shared/PolicySandbox";

export default function PoliciesPage({ policies = {}, C }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.textPrimary || "#F1F5F9" }}>
          Security Policy Engine & Gates (`policy.yaml`)
        </h1>
        <span style={{ fontSize: 13, color: C?.textMuted || "#475569" }}>
          Define deployment blocking rules, CVSS score thresholds, allowed CVE exceptions, and DAST header gates
        </span>
      </div>

      <PolicySandbox C={C} />
    </div>
  );
}

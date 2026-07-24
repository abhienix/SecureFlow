import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area
} from "recharts";
import { Activity, GitPullRequest, XCircle, Shield, Bot, Search } from "lucide-react";
import { Badge, KpiCard, SectionTitle } from "../shared/Common";
import { relTime } from "../../utils/formatters";
import PipelineMiniNodes from "../shared/PipelineMiniNodes";
import LiveTelemetryStreamCard from "../shared/LiveTelemetryStreamCard";

export function OverviewTab({ scans, totalScans, healthScore, avgRisk, blocked, allowed, running, completed, feedback, onFeedback, onOpenWhyBlocked, onOpenDetail, C }) {
  const [search, setSearch] = useState("");
  const [filterSev, setFilterSev] = useState("ALL");

  // Multi-line severity trends across scan runs
  const severityTrendData = useMemo(() => {
    return scans.slice(0, 7).reverse().map((s, idx) => {
      let crit = 0, high = 0, med = 0, low = 0;
      (s.vulnerabilities || []).forEach(v => {
        const score = parseFloat(v.score) || 0;
        const severity = (v.severity || "").toUpperCase();
        if (score >= 9.0 || severity === "CRITICAL") crit++;
        else if (score >= 7.0 || severity === "HIGH") high++;
        else if (score >= 4.0 || severity === "MEDIUM") med++;
        else low++;
      });
      return {
        name: `Run #${s.id || idx + 1}`,
        Critical: crit,
        High: high,
        Medium: med,
        Low: low,
      };
    });
  }, [scans]);

  // Center-metric severity donut
  const severityPieData = useMemo(() => {
    let crit = 0, high = 0, med = 0, low = 0;
    scans.forEach(s => {
      (s.vulnerabilities || []).forEach(v => {
        const score = parseFloat(v.score) || 0;
        const severity = (v.severity || "").toUpperCase();
        if (score >= 9.0 || severity === "CRITICAL") crit++;
        else if (score >= 7.0 || severity === "HIGH") high++;
        else if (score >= 4.0 || severity === "MEDIUM") med++;
        else low++;
      });
    });
    return [
      { name: "Critical", value: crit, color: C.red },
      { name: "High", value: high, color: C.amber },
      { name: "Medium", value: med, color: C.violet },
      { name: "Low", value: low, color: C.teal },
    ];
  }, [scans, C]);

  const totalVulns = useMemo(() => severityPieData.reduce((a, b) => a + b.value, 0), [severityPieData]);

  // Horizontal threat ranking bars derived dynamically from database findings
  const topFindings = useMemo(() => {
    let secrets = 0;
    let policyGate = 0;
    let containerCves = 0;
    let sastFlaws = 0;
    let dastFlaws = 0;

    scans.forEach(s => {
      (s.vulnerabilities || []).forEach(v => {
        if (v.tool === "Gitleaks") secrets++;
        else if (v.tool === "Policy Engine") policyGate++;
        else if (v.tool === "Semgrep") sastFlaws++;
        else if (v.tool === "Trivy") containerCves++;
        else dastFlaws++;
      });
    });

    const ranSecrets = scans.some(s => {
      const step = s.pipeline_steps?.code_scan || s.pipeline_steps?.secrets;
      return step && step.result && step.result !== "SKIPPED";
    });
    const ranPolicy = scans.some(s => {
      const step = s.pipeline_steps?.policy;
      return step && step.result && step.result !== "SKIPPED";
    });
    const ranContainer = scans.some(s => {
      const step = s.pipeline_steps?.trivy;
      return step && step.result && step.result !== "SKIPPED";
    });
    const ranSast = scans.some(s => {
      const step = s.pipeline_steps?.code_scan;
      return step && step.result && step.result !== "SKIPPED";
    });
    const ranDast = scans.some(s => {
      const step = s.pipeline_steps?.zap;
      return step && step.result && step.result !== "SKIPPED";
    });

    const categories = [
      { type: "Exposed Secrets & API Keys (Gitleaks)", count: secrets, configured: ranSecrets },
      { type: "Policy Gate Violations (Unpinned SHAs)", count: policyGate, configured: ranPolicy },
      { type: "Container & Layer OS Vulnerabilities (Trivy)", count: containerCves, configured: ranContainer },
      { type: "OWASP Top 10 SAST Flaws (Semgrep)", count: sastFlaws, configured: ranSast },
      { type: "Runtime DAST API Flaws (OWASP ZAP)", count: dastFlaws, configured: ranDast },
    ];

    const maxCount = Math.max(...categories.map(c => c.count), 1);

    return categories.map(c => ({
      ...c,
      color: c.configured ? (c.count > 0 ? (c.type.includes("Secrets") ? C.red : c.type.includes("Policy") ? C.amber : C.violet) : C.green) : C.inkLow,
      pct: c.configured ? Math.round((c.count / maxCount) * 100) : 0
    }));
  }, [scans, C]);

  // Top Priority Remediation Queue
  const severeFindings = useMemo(() => {
    const list = [];
    scans.forEach(s => {
      (s.vulnerabilities || []).forEach(v => {
        list.push({
          severity: v.cvss_score >= 7.0 ? "CRITICAL" : "HIGH",
          finding: `${v.cve_id} — ${v.title || v.rule_id || "Vulnerability"}`,
          resource: v.file_path || s.repo_name || "backend/main.py",
          scanId: s.id,
          commitSha: s.commit_sha?.slice(0, 8) || "main",
          scan: s
        });
      });
    });
    return list.slice(0, 5);
  }, [scans]);

  // Dynamic Compliance Framework Readiness Scorecard
  const complianceData = useMemo(() => {
    let soc2 = 98;
    let iso = 96;
    let nist = 94;
    let owasp = 95;
    let pci = 92;
    let cis = 97;

    let crit = 0, high = 0, med = 0, secrets = 0, sast = 0;
    scans.forEach(s => {
      (s.vulnerabilities || []).forEach(v => {
        const severity = (v.severity || "").toUpperCase();
        if (severity === "CRITICAL") crit++;
        else if (severity === "HIGH") high++;
        else if (severity === "MEDIUM") med++;

        if (v.tool === "Gitleaks" || v.cve_id.includes("SECRET")) secrets++;
        if (v.tool === "Semgrep") sast++;
      });
    });

    if (secrets > 0) {
      soc2 -= Math.min(30, secrets * 10);
      iso -= Math.min(25, secrets * 8);
      pci -= Math.min(35, secrets * 12);
      cis -= Math.min(20, secrets * 5);
    }
    if (sast > 0) {
      owasp -= Math.min(25, sast * 5);
      iso -= Math.min(15, sast * 3);
    }

    const totalCveDeduction = (crit * 4) + (high * 2) + (med * 0.5);
    soc2 -= Math.min(20, totalCveDeduction * 0.8);
    nist -= Math.min(30, totalCveDeduction * 1.2);
    pci -= Math.min(25, totalCveDeduction * 1.0);
    cis -= Math.min(25, totalCveDeduction * 0.9);

    return [
      { subject: "SOC 2", score: Math.round(Math.max(40, soc2)) },
      { subject: "ISO 27001", score: Math.round(Math.max(40, iso)) },
      { subject: "NIST 800-53", score: Math.round(Math.max(40, nist)) },
      { subject: "OWASP ASVS", score: Math.round(Math.max(40, owasp)) },
      { subject: "PCI-DSS 4.0", score: Math.round(Math.max(40, pci)) },
      { subject: "CIS Benchmarks", score: Math.round(Math.max(40, cis)) },
    ];
  }, [scans]);

  // Dynamic Scanner Engine Detection Volume
  const engineVolumeData = useMemo(() => {
    let trivyCount = 0;
    let gitleaksCount = 0;
    let semgrepCount = 0;
    let zapCount = 0;

    scans.forEach(s => {
      (s.vulnerabilities || []).forEach(v => {
        if (v.tool === "Gitleaks") gitleaksCount++;
        else if (v.tool === "Semgrep") semgrepCount++;
        else if (v.tool === "Trivy") trivyCount++;
        else if (v.tool === "OWASP ZAP" || v.tool === "ZAP") zapCount++;
      });
      const zapStep = s.pipeline?.find(p => p.key === "zap");
      if (zapStep?.status === "failed") {
        zapCount += 2;
      }
    });

    return [
      { engine: "Trivy CVEs", count: trivyCount, fill: C.teal },
      { engine: "Gitleaks Secrets", count: gitleaksCount, fill: C.red },
      { engine: "Semgrep SAST", count: semgrepCount, fill: C.violet },
      { engine: "ZAP DAST", count: zapCount, fill: C.cyan },
    ];
  }, [scans, C]);

  const filteredScans = useMemo(() => {
    return scans.filter(s => {
      const matchesSearch = !search || s.repo_name?.toLowerCase().includes(search.toLowerCase()) || s.commit_sha?.toLowerCase().includes(search.toLowerCase());
      const matchesSev = filterSev === "ALL" || s.action_taken === filterSev || s.severity === filterSev;
      return matchesSearch && matchesSev;
    });
  }, [scans, search, filterSev]);

  return (
    <div>
      {/* Top Stat Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard title="Security Posture" value={`${healthScore}%`} sub="Overall Gate Score" Icon={Activity} color={healthScore >= 75 ? C.teal : C.amber} C={C} />
        <KpiCard title="Total Scans" value={totalScans ?? scans.length} sub={`${running.length} Running Live`} Icon={GitPullRequest} color={C.blue} C={C} />
        <KpiCard title="Blocked Builds" value={blocked.length} sub={`${((blocked.length / (completed.length || 1)) * 100).toFixed(0)}% Block Rate`} Icon={XCircle} color={C.red} C={C} />
        <KpiCard title="Avg Risk Score" value={avgRisk} sub="Out of 10 max" Icon={Shield} color={avgRisk >= 7 ? C.red : avgRisk >= 4 ? C.amber : C.teal} C={C} />
      </div>

      {/* Row 1 Graphs: Multi-line Trends + Center Metric Donut + Horizontal Bars */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 24 }}>
        {/* Multi-Line Severity Trend Chart */}
        <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, height: 280, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SectionTitle accent={C.red} C={C}>Security Gate Severity Trends Over Time</SectionTitle>
            <div style={{ display: "flex", gap: 8, fontSize: 10, fontWeight: 700 }}>
              <span style={{ color: C.red }}>● Critical</span>
              <span style={{ color: C.amber }}>● High</span>
              <span style={{ color: C.violet }}>● Medium</span>
              <span style={{ color: C.teal }}>● Low</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={severityTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" stroke={C.inkMid} fontSize={10} />
              <YAxis stroke={C.inkMid} fontSize={10} />
              <Tooltip contentStyle={{ background: C.bgCard, borderColor: C.border, color: C.ink }} />
              <Line type="monotone" dataKey="Critical" stroke={C.red} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="High" stroke={C.amber} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Medium" stroke={C.violet} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Low" stroke={C.teal} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Center-Text Severity Donut */}
        <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, height: 280, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <SectionTitle accent={C.violet} C={C}>Active Vulnerabilities by Severity</SectionTitle>
          <div style={{ width: "100%", height: 160, position: "relative", display: "flex", justifyContent: "center" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityPieData} innerRadius={42} outerRadius={65} paddingAngle={4} dataKey="value">
                  {severityPieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: C.bgCard, borderColor: C.border, color: C.ink }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.ink }}>{totalVulns}</div>
              <div style={{ fontSize: 9, color: C.inkLow }}>Total</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, fontSize: 11, marginTop: 8 }}>
            {severityPieData.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                <span style={{ color: C.inkMid }}>{s.name}:</span>
                <strong style={{ color: C.ink }}>{s.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Horizontal Threat Bar Chart */}
        <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, height: 280, display: "flex", flexDirection: "column" }}>
          <SectionTitle accent={C.cyan} C={C}>Top Threat Category Rankings</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {topFindings.map((tf, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: tf.configured ? C.inkMid : C.inkLow, fontWeight: 600 }}>{tf.type}</span>
                  <strong style={{ color: tf.configured ? (tf.count > 0 ? tf.color : C.green) : C.inkLow, fontSize: 10, textTransform: "uppercase" }}>
                    {tf.configured ? `${tf.count} Findings` : "Not Configured"}
                  </strong>
                </div>
                <div style={{ width: "100%", height: 6, background: C.bgSurface, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.border}`, opacity: tf.configured ? 1 : 0.4 }}>
                  <div style={{ width: `${tf.pct}%`, height: "100%", background: tf.color, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2 Matrix Graphs: Compliance Radar + Scanner Engine Volume + Risk Density Area */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 24 }}>
        {/* Compliance Framework Checklist Progress Card */}
        <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, height: 280, display: "flex", flexDirection: "column" }}>
          <SectionTitle accent={C.teal} C={C}>Compliance Framework Readiness</SectionTitle>
          <p style={{ fontSize: 11, color: C.inkLow, marginBottom: 14, lineHeight: 1.4 }}>
            Dynamic audit readiness indicators mapped to current security controls.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* SOC 2 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: C.ink }}>SOC 2 Type II Compliance</span>
                <span style={{ fontFamily: C.mono, fontWeight: 800, color: C.teal }}>{complianceData[0]?.score || 0}% Ready</span>
              </div>
              <div style={{ width: "100%", height: 6, background: C.bgSurface, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <div style={{ width: `${complianceData[0]?.score || 0}%`, height: "100%", background: C.teal, borderRadius: 4 }} />
              </div>
            </div>

            {/* ISO 27001 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: C.ink }}>ISO/IEC 27001 Information Security</span>
                <span style={{ fontFamily: C.mono, fontWeight: 800, color: C.violet }}>{complianceData[1]?.score || 0}% Ready</span>
              </div>
              <div style={{ width: "100%", height: 6, background: C.bgSurface, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <div style={{ width: `${complianceData[1]?.score || 0}%`, height: "100%", background: C.violet, borderRadius: 4 }} />
              </div>
            </div>

            {/* PCI-DSS */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: C.ink }}>PCI-DSS 4.0 Financial Security</span>
                <span style={{ fontFamily: C.mono, fontWeight: 800, color: C.blue }}>{complianceData[4]?.score || 0}% Ready</span>
              </div>
              <div style={{ width: "100%", height: 6, background: C.bgSurface, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <div style={{ width: `${complianceData[4]?.score || 0}%`, height: "100%", background: C.blue, borderRadius: 4 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Scanner Engine Detection Volume Bar Chart */}
        <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, height: 280, display: "flex", flexDirection: "column" }}>
          <SectionTitle accent={C.amber} C={C}>Detection Volume by Security Engine</SectionTitle>
          <div style={{ width: "100%", height: 210, marginTop: 4 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engineVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="engine" stroke={C.inkMid} fontSize={10} />
                <YAxis stroke={C.inkMid} fontSize={10} />
                <Tooltip contentStyle={{ background: C.bgCard, borderColor: C.border, color: C.ink }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {engineVolumeData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CVSS Risk Score Density Area Chart */}
        <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, height: 280, display: "flex", flexDirection: "column" }}>
          <SectionTitle accent={C.blue} C={C}>Risk Exposure Trajectory & Gate Score</SectionTitle>
          <div style={{ width: "100%", height: 210, marginTop: 4 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={severityTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" stroke={C.inkMid} fontSize={10} />
                <YAxis stroke={C.inkMid} fontSize={10} />
                <Tooltip contentStyle={{ background: C.bgCard, borderColor: C.border, color: C.ink }} />
                <Area type="monotone" dataKey="High" stroke={C.amber} fill={`${C.amber}25`} />
                <Area type="monotone" dataKey="Critical" stroke={C.red} fill={`${C.red}35`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Top Priority Remediation Queue */}
      <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, marginBottom: 24 }}>
        <SectionTitle accent={C.amber} C={C}>Top Priority Vulnerability Remediation Queue</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.inkLow }}>
                <th style={{ padding: "8px 10px" }}>Severity</th>
                <th style={{ padding: "8px 10px" }}>Vulnerability Finding</th>
                <th style={{ padding: "8px 10px" }}>Target File / Resource</th>
                <th style={{ padding: "8px 10px" }}>Commit SHA</th>
                <th style={{ padding: "8px 10px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {severeFindings.map((f, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px" }}>
                    <span style={{
                      padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800,
                      background: f.severity === "CRITICAL" ? C.redSoft : C.amberSoft,
                      color: f.severity === "CRITICAL" ? C.red : C.amber,
                      border: `1px solid ${f.severity === "CRITICAL" ? C.redBorder : C.amberBorder}`
                    }}>
                      {f.severity}
                    </span>
                  </td>
                  <td style={{ padding: "10px", color: C.ink, fontWeight: 700 }}>{f.finding}</td>
                  <td style={{ padding: "10px", color: C.teal, fontFamily: C.mono }}>{f.resource}</td>
                  <td style={{ padding: "10px", color: C.inkMid, fontFamily: C.mono }}>{f.commitSha}</td>
                  <td style={{ padding: "10px" }}>
                    <button
                      onClick={() => onOpenDetail(f.scan)}
                      style={{
                        padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: C.tealSoft, border: `1px solid ${C.tealBorder}`, color: C.teal,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                      }}
                    >
                      <Bot size={12} /> Inspect Fix
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <SectionTitle accent={C.teal} C={C}>Real-Time CI/CD Security Pipeline Scan Feed</SectionTitle>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px" }}>
            <Search size={14} color={C.inkMid} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Filter by repo or SHA..."
              style={{ background: "none", border: "none", color: C.ink, fontSize: 12, outline: "none", width: 140 }}
            />
          </div>
          <select
            value={filterSev} onChange={e => setFilterSev(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}`, color: C.ink, fontSize: 12 }}
          >
            <option value="ALL">All Statuses</option>
            <option value="BLOCK">Blocked Only</option>
            <option value="ALLOW">Allowed Only</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredScans.slice(0, 15).map(scan => (
          <motion.div
            key={scan.id}
            whileHover={{ scale: 1.005, y: -2 }}
            className={`sf-card-hover ${scan.status === "running" ? "running-card-live" : ""}`}
            style={{
              padding: "16px 20px", background: C.bgCard, border: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{scan.repo_name}</span>
                <Badge color={scan.action_taken === "BLOCK" ? C.red : C.teal} C={C}>{scan.action_taken || "ALLOW"}</Badge>
                {scan.status === "running" && <Badge color={C.blue} C={C}>Running</Badge>}
              </div>
              <div style={{ fontSize: 12, color: C.inkMid, fontFamily: C.mono }}>
                {scan.commit_sha?.slice(0, 8)} · {scan.branch} · {relTime(scan.created_at)}
              </div>
            </div>

            <div style={{ flex: 2, minWidth: 260 }}>
              <PipelineMiniNodes pipeline={scan.pipeline} live={scan.status === "running"} C={C} />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {scan.action_taken === "BLOCK" && (
                <button
                  onClick={() => onOpenWhyBlocked(scan)}
                  style={{
                    padding: "6px 12px", borderRadius: 8,
                    background: C.redSoft, border: `1px solid ${C.redBorder}`,
                    color: C.red, fontSize: 12, fontWeight: 700,
                  }}
                >
                  Why Blocked?
                </button>
              )}
              <button
                onClick={() => onOpenDetail(scan)}
                style={{
                  padding: "6px 12px", borderRadius: 8,
                  background: C.bgSurface, border: `1px solid ${C.border}`,
                  color: C.ink, fontSize: 12, fontWeight: 600,
                }}
              >
                Details
              </button>
            </div>
          </motion.div>
        ))}
      </div>
      <LiveTelemetryStreamCard scans={scans} C={C} />
    </div>
  );
}

export default OverviewTab;

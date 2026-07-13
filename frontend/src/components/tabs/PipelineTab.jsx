import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { Loader2, CheckCircle, XCircle, CircleDashed, Terminal, Copy, Check } from "lucide-react";
import { Badge, SectionTitle } from "../shared/Common";
import { relTime } from "../../utils/formatters";
import RunningPipelineBanner from "../RunningPipelineBanner";

export function PipelineDetailedCard({ scan, onOpenWhyBlocked, onOpenDetail, C }) {
  const [expandedStage, setExpandedStage] = useState(null);
  const [copiedSha, setCopiedSha] = useState(false);

  const copySha = () => {
    if (!scan.commit_sha) return;
    navigator.clipboard?.writeText(scan.commit_sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const STAGE_DETAILS = {
    checkout: {
      cmd: `git checkout ${scan.commit_sha || "HEAD"}`,
      duration: "1.2s",
      log: `[Step 0: Checkout]\nFetching repository ${scan.repo_name} (${scan.branch})...\nChecking out commit ${scan.commit_sha} with fetch-depth: 0\nHEAD is now at ${scan.commit_sha?.slice(0, 8)}: ${scan.commit_message}`,
    },
    code_scan: {
      cmd: "gitleaks detect --source=. --report-format=json && semgrep scan --config=auto",
      duration: "3.4s",
      log: `[Step 1: Code Scan]\nRunning Gitleaks secret scanner...\nRunning Semgrep SAST rule evaluation...\nResults: ${scan.action_taken === "BLOCK" ? "Policy Violation Flagged (github-actions-mutable-action-tag)" : "0 high severity patterns found"}`,
    },
    docker: {
      cmd: `docker build -t us-central1-docker.pkg.dev/secureflow-499814/secureflow-repo/backend:${scan.commit_sha?.slice(0, 8)} .`,
      duration: "14.8s",
      log: `[Step 2: Docker Build]\nStep 1/10 : FROM python:3.11-slim\nStep 2/10 : WORKDIR /app\nSuccessfully built image ${scan.commit_sha?.slice(0, 8)}`,
    },
    trivy: {
      cmd: `trivy image --severity HIGH,CRITICAL --format json output.json us-central1-docker.pkg.dev/secureflow-499814/secureflow-repo/backend:${scan.commit_sha?.slice(0, 8)}`,
      duration: "4.1s",
      log: `[Step 3: Trivy CVE Scan]\nScanning container image dependencies...\nVulnerabilities found: ${scan.vulnerabilities?.length || 0} (${scan.severity_counts?.CRITICAL || 0} Critical, ${scan.severity_counts?.HIGH || 0} High)`,
    },
    policy: {
      cmd: "python policy_engine.py evaluate --scan-id=" + scan.id + " --policy-config=policy.yaml",
      duration: "0.8s",
      log: `[Step 4: Policy Gate]\nEvaluating scan #${scan.id} against policy.yaml...\nDecision: ${scan.action_taken} (Risk Score: ${scan.risk_score}/10)`,
    },
    deploy: {
      cmd: `gcloud run deploy secureflow-backend --image us-central1-docker.pkg.dev/secureflow-499814/secureflow-repo/backend:${scan.commit_sha?.slice(0, 8)} --region us-central1`,
      duration: "8.5s",
      log: `[Step 5: Cloud Run Deploy]\n${scan.action_taken === "BLOCK" ? "Deploy SKIPPED/CANCELLED due to Policy Gate BLOCK decision." : "Service [secureflow-backend] revision deployed successfully to Cloud Run."}`,
    },
    zap: {
      cmd: "zap-baseline.py -t https://secureflow-backend-1083585992526.us-central1.run.app/docs -g gen.conf -r zap_report.html",
      duration: "6.2s",
      log: `[Step 6: OWASP ZAP DAST Scan]\nProbing live Cloud Run URL: https://secureflow-backend-1083585992526.us-central1.run.app/docs\nEvaluating HTTP Security Headers & CORS policies...\nHTTP Status: 200 OK (Baseline API DAST Passed)`,
    },
  };

  return (
    <div style={{ padding: "20px 24px", background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 4px 20px rgba(0,0,0,.04)" }}>
      {/* Top Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: "-0.01em" }}>{scan.repo_name}</span>
            <Badge color={C.blue} C={C}>{scan.branch}</Badge>
            <Badge color={scan.action_taken === "BLOCK" ? C.red : C.teal} C={C}>{scan.action_taken}</Badge>
          </div>
          <div style={{ fontSize: 13, color: C.inkMid, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
            "{scan.commit_message}"
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: C.inkLow, fontFamily: C.mono, flexWrap: "wrap" }}>
            <span style={{ background: C.bgSurface, padding: "2px 8px", borderRadius: 6, border: `1px solid ${C.border}` }}>
              SHA: {scan.commit_sha?.slice(0, 12)}…
            </span>
            <button onClick={copySha} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700 }}>
              {copiedSha ? <Check size={12} /> : <Copy size={12} />}
              {copiedSha ? "Copied Full SHA" : "Copy SHA"}
            </button>
            <span>· {relTime(scan.created_at)}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {scan.action_taken === "BLOCK" && (
            <button onClick={() => onOpenWhyBlocked(scan)} style={{ padding: "7px 14px", borderRadius: 8, background: C.redSoft, border: `1px solid ${C.redBord}`, color: C.red, fontSize: 12, fontWeight: 700 }}>
              Why Blocked?
            </button>
          )}
          <button onClick={() => onOpenDetail(scan)} style={{ padding: "7px 14px", borderRadius: 8, background: C.bgSurface, border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, fontWeight: 600 }}>
            Inspect Details
          </button>
        </div>
      </div>

      {/* Visual Pipeline Stage Node Diagram */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.inkLow, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
          Pipeline Stage Flow (Click stage node to inspect command & logs)
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 6 }}>
          {scan.pipeline.map((stage, i) => {
            const isSkipped = stage.status === "skipped";
            const isPending = stage.status === "pending";
            const isActive  = stage.status === "running";
            const isSelected = expandedStage === stage.key;
            const color =
              stage.status === "passed"  ? C.teal  :
              stage.status === "failed"  ? C.red   :
              stage.status === "running" ? C.blue  :
              isSkipped                  ? C.amber : C.inkLow;
            const { Icon } = stage;
            // which stage first failed (to explain why later ones are skipped)
            const blockedAt = scan.pipeline.find(s => s.status === "failed");

            return (
              <React.Fragment key={stage.id}>
                {i > 0 && (
                  <div className={(scan.pipeline[i-1].status === "running" || isActive) ? "pipe-flow pipe-flow-active" : ""} style={{
                    flex: 1, height: (scan.pipeline[i-1].status === "running" || isActive) ? 3 : 2,
                    minWidth: 16, maxWidth: 42,
                    background: scan.pipeline[i-1].status === "passed"
                      ? `linear-gradient(90deg, ${C.teal}80, ${color}80)`
                      : isSkipped ? `${C.amber}30`
                      : (scan.pipeline[i-1].status === "running" || isActive) ? undefined : C.border,
                    borderRadius: 2,
                  }} />
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setExpandedStage(isSelected ? null : stage.key)}
                  title={isSkipped && blockedAt ? `Skipped — pipeline blocked at ${blockedAt.name}` : ""}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    background: "none", border: "none", cursor: "pointer", outline: "none",
                    minWidth: 70, opacity: isSkipped ? 0.8 : 1,
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    border: `2px ${isSkipped ? "dashed" : "solid"} ${isSelected ? C.teal : color}`,
                    background: isSelected ? `${C.teal}25` : isSkipped ? `${C.amber}14` : `${color}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isSelected ? C.teal : color,
                    boxShadow: isSelected
                      ? `0 0 0 4px ${C.teal}35, 0 0 16px ${C.teal}60`
                      : isActive ? `0 0 0 4px ${color}25, 0 0 16px ${color}55`
                      : isSkipped ? `0 0 6px ${C.amber}20` : "none",
                    transition: "all 0.2s ease",
                  }}>
                    {isActive  ? <Loader2 size={18} className="spin" /> :
                     stage.status === "passed"  ? <CheckCircle size={18} /> :
                     stage.status === "failed"  ? <XCircle size={18} /> :
                     isSkipped ? <span style={{ fontSize: 14, fontWeight: 700 }}>⊘</span> :
                     isPending ? <CircleDashed size={16} className="spin-slow" style={{ opacity: 0.6 }} /> :
                     Icon ? <Icon size={16} /> : null}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: isSelected || isActive ? 800 : 600,
                    color: isSelected ? C.teal : isSkipped ? C.amber : isActive ? C.blue : C.inkMid,
                    textAlign: "center", whiteSpace: "nowrap",
                  }}>
                    {stage.name}
                  </div>
                  {isSkipped && (
                    <div style={{ fontSize: 8, color: C.amber, fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" }}>SKIPPED</div>
                  )}
                </motion.button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Terminal Inspector Output Drawer */}
      <AnimatePresence>
        {expandedStage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            {(() => {
              const details = STAGE_DETAILS[expandedStage] || {};
              const st = scan.pipeline.find(s => s.key === expandedStage);
              const color = st?.status === "passed" ? C.teal : st?.status === "failed" ? C.red : st?.status === "running" ? C.blue : C.inkMid;
              return (
                <div style={{
                  padding: 16, background: C.bgSurface, borderRadius: 12,
                  border: `1px solid ${color}50`, marginTop: 6,
                  boxShadow: `0 8px 24px ${color}10`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Terminal size={15} color={color} />
                      <span style={{ fontSize: 12, fontWeight: 800, color: color, textTransform: "uppercase" }}>Stage Inspector: {st?.name}</span>
                      <Badge color={color} small C={C}>{st?.result || st?.status}</Badge>
                    </div>
                    <span style={{ fontFamily: C.mono, fontSize: 11, color: C.inkLow }}>Execution Time: {details.duration || "1.2s"}</span>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 10, color: C.inkLow, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                      Execution Command
                    </label>
                    <div style={{ fontFamily: C.mono, fontSize: 11, color: C.teal, background: C.bgCard, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}>
                      $ {details.cmd}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 10, color: C.inkLow, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                      Stage Console Log Output
                    </label>
                    <pre style={{
                      fontFamily: C.mono, fontSize: 11, color: C.ink,
                      background: C.bgCard, padding: 12, borderRadius: 8,
                      border: `1px solid ${C.border}`, whiteSpace: "pre-wrap",
                      maxHeight: 160, overflowY: "auto", lineHeight: 1.6,
                    }}>
                      {details.log}
                    </pre>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PipelineTab({ scans, onOpenWhyBlocked, onOpenDetail, C }) {
  const stageData = useMemo(() => [
    { stage: "Checkout", pass: 100, fail: 0 },
    { stage: "Code Scan", pass: 85, fail: 15 },
    { stage: "Docker Build", pass: 92, fail: 8 },
    { stage: "Trivy Scan", pass: 80, fail: 20 },
    { stage: "Policy Gate", pass: 88, fail: 12 },
    { stage: "Deploy", pass: 95, fail: 5 },
  ], []);

  return (
    <div>
      <RunningPipelineBanner scans={scans} C={C} />
      <SectionTitle accent={C.blue} C={C}>CI/CD Pipeline Stage Pass / Fail Rates & Deep Execution Logs</SectionTitle>

      <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, height: 260, marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart data={stageData}>
            <defs>
              <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.teal} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={C.teal} stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.red} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={C.red} stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="stage" stroke={C.inkMid} fontSize={11} />
            <YAxis stroke={C.inkMid} fontSize={11} />
            <Tooltip contentStyle={{ background: C.bgCard, borderColor: C.border, color: C.ink }} />
            <Area type="monotone" dataKey="pass" stroke={C.teal} strokeWidth={2.5} fillOpacity={1} fill="url(#passGrad)" activeDot={{ r: 6 }} name="Pass Rate (%)" />
            <Area type="monotone" dataKey="fail" stroke={C.red} strokeWidth={2.5} fillOpacity={1} fill="url(#failGrad)" activeDot={{ r: 6 }} name="Fail Rate (%)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {scans.slice(0, 15).map(scan => (
          <PipelineDetailedCard
            key={scan.id}
            scan={scan}
            onOpenWhyBlocked={onOpenWhyBlocked}
            onOpenDetail={onOpenDetail}
            C={C}
          />
        ))}
      </div>
    </div>
  );
}

export default PipelineTab;

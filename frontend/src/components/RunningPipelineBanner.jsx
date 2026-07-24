import React, { useMemo } from "react";
import { motion } from "framer-motion";
import PipelineMiniNodes from "./shared/PipelineMiniNodes";

export function RunningPipelineBanner({ scans, C }) {
  const running = useMemo(() => {
    const runningScans = scans.filter(s => s.status === "running");
    const latestPerBranch = new Map();
    runningScans.forEach(s => {
      const key = `${s.repo_name || "default"}:${s.branch || "main"}`;
      if (!latestPerBranch.has(key) || s.id > latestPerBranch.get(key).id) {
        latestPerBranch.set(key, s);
      }
    });
    return Array.from(latestPerBranch.values());
  }, [scans]);

  if (!running.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        marginBottom: 20, padding: "16px 20px",
        background: `linear-gradient(135deg, ${C.blueSoft} 0%, ${C.cyanSoft} 100%)`,
        border: `1px solid ${C.blueBorder}`,
        borderRadius: 16,
        boxShadow: `0 8px 32px ${C.blue}14`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div aria-hidden style={{
        position: "absolute", inset: 0, opacity: .35,
        background: `linear-gradient(105deg, transparent 40%, ${C.blue}22 50%, transparent 60%)`,
        animation: "scanBeam 2.2s linear infinite",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `2px solid ${C.blueBorder}`,
              borderTopColor: C.blue,
            }}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>
              {running.length} pipeline{running.length > 1 ? "s" : ""} running live
            </div>
            <div style={{ fontSize: 11, color: C.inkMid }}>Pipeline gate evaluating policy rules in real-time</div>
          </div>
        </div>
        {running.slice(0, 3).map(scan => (
          <div key={scan.id} style={{ marginBottom: running.length > 1 ? 10 : 0 }}>
            <div style={{ fontSize: 11, color: C.inkMid, marginBottom: 6, fontFamily: C.mono }}>
              {scan.commit_sha?.slice(0, 8)} · {scan.repo_name} ({scan.branch})
            </div>
            <PipelineMiniNodes pipeline={scan.pipeline} live C={C} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default RunningPipelineBanner;

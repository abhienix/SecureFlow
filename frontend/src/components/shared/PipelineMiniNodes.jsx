import React from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle, XCircle, CircleDashed } from "lucide-react";

export function PipelineMiniNodes({ pipeline, live = false, C }) {
  if (!pipeline?.length) return null;
  const nodeSize = live ? 40 : 34;
  const iconSize = live ? 17 : 15;

  // find the first failed/blocked stage so we can tell skipped stages why
  const blockedAt = pipeline.find(s => s.status === "failed");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "10px 0 4px", overflowX: "auto", paddingBottom: 4 }}>
      {pipeline.map((stage, i) => {
        const isSkipped = stage.status === "skipped";
        const isPending = stage.status === "pending";
        const isActive  = stage.status === "running";
        const color =
          stage.status === "passed"  ? C.teal  :
          stage.status === "failed"  ? C.red   :
          stage.status === "running" ? C.blue  :
          isSkipped                  ? C.amber :
          C.inkLow;
        const { Icon } = stage;
        return (
          <React.Fragment key={stage.id}>
            {i > 0 && (
              <div className={(pipeline[i-1].status === "running" || isActive) ? "pipe-flow pipe-flow-active" : ""} style={{
                flex: 1, height: (pipeline[i-1].status === "running" || isActive) ? 3 : 2,
                minWidth: live ? 14 : 10, maxWidth: live ? 38 : 28,
                background: pipeline[i-1].status === "passed"
                  ? `linear-gradient(90deg, ${C.teal}80, ${color}80)`
                  : isSkipped ? `${C.amber}30`
                  : (pipeline[i-1].status === "running" || isActive) ? undefined : C.border,
                borderRadius: 2,
              }} />
            )}
            <div
              title={isSkipped && blockedAt ? `Skipped — pipeline blocked at ${blockedAt.name}` : stage.detail || ""}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: live ? 58 : 52, cursor: isSkipped ? "help" : "default" }}
            >
              <motion.div
                className={isActive ? "node-running-3d" : ""}
                animate={isActive ? { scale: live ? [1, 1.12, 1] : [1, 1.06, 1] } : {}}
                transition={isActive ? { duration: 1.4, repeat: Infinity } : {}}
                style={{
                  width: nodeSize, height: nodeSize, borderRadius: "50%",
                  border: `2px ${isSkipped ? "dashed" : "solid"} ${color}`,
                  background: isSkipped ? `${C.amber}14` : isPending ? "transparent" : `${color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color,
                  boxShadow: isActive
                    ? `0 0 0 ${live ? 6 : 4}px ${color}25, 0 0 ${live ? 24 : 16}px ${color}55`
                    : isSkipped ? `0 0 6px ${C.amber}20` : `0 0 8px ${color}20`,
                  opacity: isSkipped || isPending ? 0.75 : 1,
                }}>
                {isActive  ? <Loader2 size={iconSize} className="spin" /> :
                 stage.status === "passed"  ? <CheckCircle size={iconSize} /> :
                 stage.status === "failed"  ? <XCircle size={iconSize} /> :
                 isSkipped ? <span style={{ fontSize: live ? 13 : 11, fontWeight: 700 }}>⊘</span> :
                 isPending ? <CircleDashed size={iconSize - 2} className="spin-slow" style={{ opacity: 0.6 }} /> :
                 Icon ? <Icon size={iconSize - 2} /> : null}
              </motion.div>
              <div style={{ fontSize: 9, color: isSkipped ? C.amber : isActive ? C.blue : isPending ? C.inkLow : C.inkMid, fontWeight: isSkipped || isActive ? 700 : 500, textAlign: "center", whiteSpace: "nowrap" }}>
                {stage.name}
              </div>
              {isSkipped && (
                <div style={{ fontSize: 8, color: C.amber, fontWeight: 600, textAlign: "center", whiteSpace: "nowrap", opacity: 0.85 }}>SKIPPED</div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default PipelineMiniNodes;

import React from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "./Common";

export function PipelineFullView({ pipeline, C }) {
  if (!pipeline?.length) return null;
  const blockedAt = pipeline.find(s => s.status === "failed");
  return (
    <div style={{ marginTop: 14 }}>
      {pipeline.map((stage, i) => {
        const isSkipped = stage.status === "skipped";
        const color =
          stage.status === "passed"  ? C.teal  :
          stage.status === "failed"  ? C.red   :
          stage.status === "running" ? C.blue  :
          isSkipped                  ? C.amber  : C.inkMid;
        const { Icon } = stage;
        return (
          <div key={stage.id} style={{ display: "flex", gap: 14, marginBottom: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 34, flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                border: `2px ${isSkipped ? "dashed" : "solid"} ${color}`,
                background: `${color}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color, flexShrink: 0, opacity: isSkipped ? 0.7 : 1,
                boxShadow: stage.status === "running" ? `0 0 14px ${color}60` : "none",
              }}>
                {stage.status === "running" ? <Loader2 size={14} className="spin" /> :
                 stage.status === "passed"  ? <CheckCircle size={14} /> :
                 stage.status === "failed"  ? <XCircle size={14} /> :
                 isSkipped                  ? <span style={{ fontSize: 13 }}>⊘</span> :
                 Icon ? <Icon size={12} /> : null}
              </div>
              {i < pipeline.length - 1 && (
                <div style={{
                  width: 2, flex: 1, minHeight: 22,
                  background: stage.status === "passed" ? `linear-gradient(${color}, ${color}30)` : C.border,
                  marginTop: 4, marginBottom: 4, borderRadius: 2,
                }} />
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: i < pipeline.length - 1 ? 14 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: isSkipped ? C.amber : C.ink }}>{stage.name}</span>
                <Badge color={color} small C={C}>{stage.result || stage.status}</Badge>
              </div>
              {isSkipped && blockedAt && (
                <div style={{
                  fontSize: 11, color: C.amber, fontFamily: C.mono,
                  background: `${C.amber}12`, padding: "5px 10px",
                  borderRadius: 6, border: `1px dashed ${C.amber}50`, marginTop: 2,
                }}>
                  ⊘ Skipped — pipeline was blocked at {blockedAt.name}
                </div>
              )}
              {!isSkipped && stage.detail && (
                <div style={{
                  fontSize: 12, color: C.inkMid, fontFamily: C.mono,
                  background: C.bgSurface, padding: "6px 10px",
                  borderRadius: 6, border: `1px solid ${C.border}`, marginTop: 4,
                }}>
                  {stage.detail}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PipelineFullView;

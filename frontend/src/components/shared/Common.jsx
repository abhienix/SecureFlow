import React from "react";
import { motion } from "framer-motion";

export const Badge = ({ children, color, C, small=false }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: small ? "2px 7px" : "3px 9px", borderRadius: 999,
    background: `${color}18`, border: `1px solid ${color}40`,
    color, fontSize: small ? 10 : 11, fontWeight: 700,
    fontFamily: C.mono, letterSpacing: "0.02em", whiteSpace: "nowrap",
  }}>
    <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
    {children}
  </span>
);

export const IconBtn = ({ Icon, onClick, title, color, C }) => (
  <motion.button
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.94 }}
    onClick={onClick}
    title={title}
    style={{
      width: 32, height: 32, borderRadius: 8,
      border: `1px solid ${C.border}`,
      background: C.bgCard,
      color: color || C.inkMid,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 1px 3px rgba(0,0,0,.08)",
    }}
  >
    <Icon size={15} />
  </motion.button>
);

export const KpiCard = ({ title, value, sub, Icon, color, C }) => (
  <motion.div
    whileHover={{ y: -3, scale: 1.01 }}
    className="sf-card-hover kpi-shine"
    style={{
      padding: "16px 18px", flex: 1, minWidth: 200,
      background: C.bgCard, border: `1px solid ${C.border}`,
      boxShadow: "0 4px 16px rgba(0,0,0,.06)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.inkMid, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {title}
      </span>
      {Icon && (
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}16`, border: `1px solid ${color}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={16} color={color} />
        </div>
      )}
    </div>
    <div style={{ fontSize: 28, fontWeight: 900, fontFamily: C.mono, color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11, color: C.inkLow, marginTop: 6, fontWeight: 500 }}>{sub}</div>
  </motion.div>
);

export const SectionTitle = ({ children, accent, right, C }) => (
  <div style={{
    fontSize: 11, fontWeight: 800, color: accent || C.inkMid,
    letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14,
    display: "flex", alignItems: "center", justifyContent: "space-between",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      {accent && <div style={{ width: 3, height: 14, background: accent, borderRadius: 2, flexShrink: 0 }} />}
      {children}
    </div>
    {right}
  </div>
);

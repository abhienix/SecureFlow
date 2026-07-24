import React, { createContext, useContext, useState, useEffect } from "react";

const THEMES = {
  dark: {
    isDark: true,
    bg: "#080c14",
    bgCard: "#0f172a",
    bgSurface: "#111827",
    bgElevated: "#1e293b",
    bgSecondary: "#111827",
    bgHover: "#1e293b",
    border: "#1e293b",
    borderMid: "#334155",
    borderStrong: "#475569",
    borderDefault: "#1e293b",
    borderSubtle: "rgba(255,255,255,0.06)",
    ink: "#f8fafc",
    inkMid: "#94a3b8",
    inkLow: "#64748b",
    inkMuted: "#475569",
    textPrimary: "#f8fafc",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",
    accent: "#6366F1",
    accentSoft: "rgba(99,102,241,0.12)",
    accentBorder: "rgba(99,102,241,0.25)",
    green: "#10b981",
    greenSoft: "rgba(16,185,129,0.12)",
    greenBorder: "rgba(16,185,129,0.25)",
    greenBord: "rgba(16,185,129,0.25)",
    red: "#ef4444",
    redSoft: "rgba(239,68,68,0.12)",
    redBorder: "rgba(239,68,68,0.25)",
    redBord: "rgba(239,68,68,0.25)",
    amber: "#f59e0b",
    amberSoft: "rgba(245,158,11,0.12)",
    amberBorder: "rgba(245,158,11,0.25)",
    amberBord: "rgba(245,158,11,0.25)",
    blue: "#3b82f6",
    blueSoft: "rgba(59,130,246,0.12)",
    blueBorder: "rgba(59,130,246,0.25)",
    blueBord: "rgba(59,130,246,0.25)",
    violet: "#a855f7",
    violetSoft: "rgba(168,85,247,0.12)",
    cyan: "#06b6d4",
    cyanSoft: "rgba(6,182,212,0.12)",
    teal: "#00f2fe",
    tealSoft: "rgba(0,242,254,0.12)",
    tealBord: "rgba(0,242,254,0.25)",
    tealMid: "#38bdf8",
    skeleton: "rgba(255,255,255,0.04)",
    skeletonShine: "rgba(255,255,255,0.08)",
    shadow: "0 1px 3px rgba(0,0,0,0.4)",
    shadowLg: "0 8px 32px rgba(0,0,0,0.5)",
    mono: "'JetBrains Mono','Fira Code','Courier New',monospace",
    sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  },
  light: {
    isDark: false,
    bg: "#f1f5f9",
    bgCard: "#ffffff",
    bgSurface: "#f8fafc",
    bgElevated: "#e2e8f0",
    bgSecondary: "#f8fafc",
    bgHover: "#e2e8f0",
    border: "#cbd5e1",
    borderMid: "#94a3b8",
    borderStrong: "#64748b",
    borderDefault: "#cbd5e1",
    borderSubtle: "rgba(0,0,0,0.06)",
    ink: "#0f172a",
    inkMid: "#334155",
    inkLow: "#475569",
    inkMuted: "#64748b",
    textPrimary: "#0f172a",
    textSecondary: "#334155",
    textMuted: "#64748b",
    accent: "#4f46e5",
    accentSoft: "rgba(79,70,229,0.08)",
    accentBorder: "rgba(79,70,229,0.25)",
    green: "#059669",
    greenSoft: "rgba(5,150,105,0.08)",
    greenBorder: "rgba(5,150,105,0.25)",
    greenBord: "rgba(5,150,105,0.25)",
    red: "#dc2626",
    redSoft: "rgba(220,38,38,0.08)",
    redBorder: "rgba(220,38,38,0.25)",
    redBord: "rgba(220,38,38,0.25)",
    amber: "#d97706",
    amberSoft: "rgba(217,119,6,0.08)",
    amberBorder: "rgba(217,119,6,0.25)",
    amberBord: "rgba(217,119,6,0.25)",
    blue: "#2563eb",
    blueSoft: "rgba(37,99,235,0.08)",
    blueBorder: "rgba(37,99,235,0.25)",
    blueBord: "rgba(37,99,235,0.25)",
    violet: "#7c3aed",
    violetSoft: "rgba(124,58,237,0.08)",
    cyan: "#0891b2",
    cyanSoft: "rgba(8,145,178,0.08)",
    teal: "#0d9488",
    tealSoft: "rgba(13,148,136,0.08)",
    tealBord: "rgba(13,148,136,0.25)",
    tealMid: "#0284c7",
    skeleton: "rgba(0,0,0,0.06)",
    skeletonShine: "rgba(0,0,0,0.08)",
    shadow: "0 2px 8px rgba(15,23,42,0.06)",
    shadowLg: "0 12px 36px rgba(15,23,42,0.10)",
    mono: "'JetBrains Mono','Fira Code','Courier New',monospace",
    sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem("sf_theme");
    if (saved && (saved === "dark" || saved === "light" || saved === "system")) return saved;
    return "dark";
  });

  const resolvedMode = mode === "system"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : mode;

  const C = THEMES[resolvedMode];

  useEffect(() => {
    localStorage.setItem("sf_theme", mode);
    document.documentElement.setAttribute("data-theme", resolvedMode);
  }, [mode, resolvedMode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => setMode("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const cycleTheme = () => {
    const order = ["dark", "light", "system"];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    setMode(next);
  };

  return (
    <ThemeContext.Provider value={{ C, mode, resolvedMode, setMode, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export { THEMES };
export default ThemeContext;

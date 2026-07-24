import React, { createContext, useContext, useState, useEffect } from "react";

const THEMES = {
  dark: {
    isDark: true,
    bg: "#080c14",
    bgCard: "#0f172a",
    bgSurface: "#111827",
    bgElevated: "#1e293b",
    bgHover: "#1e293b",
    border: "#1e293b",
    borderMid: "#334155",
    borderStrong: "#475569",
    ink: "#f8fafc",
    inkMid: "#94a3b8",
    inkLow: "#64748b",
    inkMuted: "#475569",
    accent: "#6366F1",
    accentSoft: "rgba(99,102,241,0.12)",
    accentBorder: "rgba(99,102,241,0.25)",
    green: "#10b981",
    greenSoft: "rgba(16,185,129,0.12)",
    greenBorder: "rgba(16,185,129,0.25)",
    red: "#ef4444",
    redSoft: "rgba(239,68,68,0.12)",
    redBorder: "rgba(239,68,68,0.25)",
    amber: "#f59e0b",
    amberSoft: "rgba(245,158,11,0.12)",
    amberBorder: "rgba(245,158,11,0.25)",
    blue: "#3b82f6",
    blueSoft: "rgba(59,130,246,0.12)",
    blueBorder: "rgba(59,130,246,0.25)",
    violet: "#a855f7",
    violetSoft: "rgba(168,85,247,0.12)",
    cyan: "#06b6d4",
    cyanSoft: "rgba(6,182,212,0.12)",
    skeleton: "rgba(255,255,255,0.04)",
    skeletonShine: "rgba(255,255,255,0.08)",
    shadow: "0 1px 3px rgba(0,0,0,0.4)",
    shadowLg: "0 8px 32px rgba(0,0,0,0.5)",
    mono: "'JetBrains Mono','Fira Code','Courier New',monospace",
    sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  },
  light: {
    isDark: false,
    bg: "#f8fafc",
    bgCard: "#ffffff",
    bgSurface: "#f1f5f9",
    bgElevated: "#e2e8f0",
    bgHover: "#f0f4f8",
    border: "#e2e8f0",
    borderMid: "#cbd5e1",
    borderStrong: "#94a3b8",
    ink: "#0f172a",
    inkMid: "#334155",
    inkLow: "#64748b",
    inkMuted: "#94a3b8",
    accent: "#4f46e5",
    accentSoft: "rgba(79,70,229,0.08)",
    accentBorder: "rgba(79,70,229,0.20)",
    green: "#059669",
    greenSoft: "rgba(5,150,105,0.08)",
    greenBorder: "rgba(5,150,105,0.20)",
    red: "#dc2626",
    redSoft: "rgba(220,38,38,0.08)",
    redBorder: "rgba(220,38,38,0.20)",
    amber: "#d97706",
    amberSoft: "rgba(217,119,6,0.08)",
    amberBorder: "rgba(217,119,6,0.20)",
    blue: "#2563eb",
    blueSoft: "rgba(37,99,235,0.08)",
    blueBorder: "rgba(37,99,235,0.20)",
    violet: "#7c3aed",
    violetSoft: "rgba(124,58,237,0.08)",
    cyan: "#0891b2",
    cyanSoft: "rgba(8,145,178,0.08)",
    skeleton: "rgba(0,0,0,0.04)",
    skeletonShine: "rgba(0,0,0,0.06)",
    shadow: "0 1px 3px rgba(0,0,0,0.08)",
    shadowLg: "0 8px 32px rgba(0,0,0,0.10)",
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

  // Listen for system theme changes
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => setMode("system"); // Force re-render
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

import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { AppProvider, useApp } from "./contexts/AppContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useScanWebSocket } from "./hooks/useScanWebSocket";
import { useUIStore } from "./stores/uiStore";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastContainer from "./components/ToastContainer";

import LoginGate from "./components/LoginGate";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import CommandPalette from "./components/layout/CommandPalette";
import GlobalAICopilot from "./components/GlobalAICopilot";

// New v2 TypeScript pages (self-contained, use TanStack Query + Zustand)
import MissionControlPage from "./components/pages/MissionControlPage";
import FindingsWorkspace from "./components/pages/FindingsWorkspace";
import PipelineWorkspace from "./components/pages/PipelineWorkspace";
import DeploymentWorkspace from "./components/pages/DeploymentWorkspace";
import RepositoriesWorkspace from "./components/pages/RepositoriesWorkspace";
import PolicyWorkspace from "./components/pages/PolicyWorkspace";
import ObservabilityWorkspace from "./components/pages/ObservabilityWorkspace";
import ReportsWorkspace from "./components/pages/ReportsWorkspace";
import AIWorkspace from "./components/pages/AIWorkspace";
import SettingsWorkspace from "./components/pages/SettingsWorkspace";
// Legacy pages (kept for backward compat)
import DashboardPage from "./components/pages/DashboardPage";
import RepositoryWorkspacePage from "./components/pages/RepositoryWorkspacePage";

function PageError({ C }) {
  return (
    <div style={{
      padding: 40, textAlign: "center", display: "flex", flexDirection: "column",
      alignItems: "center", gap: 16, color: C?.inkMid || "#94a3b8",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: C?.redSoft || "rgba(239,68,68,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28,
      }}>⚠️</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C?.ink || "#f8fafc" }}>Page Not Found or Error</h2>
      <p style={{ fontSize: 14, maxWidth: 400 }}>The requested route could not be found or encountered an error.</p>
      <button
        onClick={() => window.location.href = "/dashboard"}
        style={{
          padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
          background: C?.accent || "#6366F1", color: "#fff", fontWeight: 600, fontSize: 13,
        }}
      >Back to Dashboard</button>
    </div>
  );
}

function AppShell() {
  const { C } = useTheme();
  const { scans, repositories, metrics, error, fetchAllData } = useApp();
  const navigate = useNavigate();
  const { isCmdPaletteOpen, setCmdPaletteOpen, isCopilotOpen, setCopilotOpen, toggleCmdPalette } = useUIStore();
  const [selectedRepo] = React.useState(null);

  // New TanStack Query-powered WebSocket (exponential backoff + cache invalidation)
  useScanWebSocket();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleCmdPalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleCmdPalette]);

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: C.bg, color: C.ink,
      fontFamily: C.sans,
    }}>
      <Sidebar C={C} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden" }}>
        <TopBar C={C} />

        {error && (
          <div style={{
            padding: "10px 24px", background: C.redSoft, borderBottom: `1px solid ${C.redBorder}`,
            color: C.red, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>⚠️</span> {error}
            <button onClick={fetchAllData} style={{
              marginLeft: "auto", padding: "4px 12px", borderRadius: 6, border: `1px solid ${C.redBorder}`,
              background: "transparent", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>Retry</button>
          </div>
        )}

        <main style={{ flex: 1, padding: 24, overflowY: "auto", background: C.bg }}>
            <Routes>
              <Route path="/" element={<Navigate to="/mission-control" replace />} />
              <Route path="/mission-control" element={<ErrorBoundary><MissionControlPage /></ErrorBoundary>} />
              <Route path="/findings" element={<ErrorBoundary><FindingsWorkspace /></ErrorBoundary>} />
              <Route path="/pipelines" element={<ErrorBoundary><PipelineWorkspace /></ErrorBoundary>} />
              <Route path="/deployments" element={<ErrorBoundary><DeploymentWorkspace /></ErrorBoundary>} />
              <Route path="/repositories" element={<ErrorBoundary><RepositoriesWorkspace /></ErrorBoundary>} />
              <Route path="/repositories/workspace" element={<ErrorBoundary><RepositoryWorkspacePage repo={selectedRepo} scans={scans} onBack={() => navigate("/repositories")} C={C} /></ErrorBoundary>} />
              <Route path="/policies" element={<ErrorBoundary><PolicyWorkspace /></ErrorBoundary>} />
              <Route path="/observability" element={<ErrorBoundary><ObservabilityWorkspace /></ErrorBoundary>} />
              <Route path="/reports" element={<ErrorBoundary><ReportsWorkspace /></ErrorBoundary>} />
              <Route path="/copilot" element={<ErrorBoundary><AIWorkspace /></ErrorBoundary>} />
              <Route path="/settings" element={<ErrorBoundary><SettingsWorkspace /></ErrorBoundary>} />
              <Route path="/dashboard" element={<ErrorBoundary><DashboardPage scans={scans} repositories={repositories} metrics={metrics} C={C} /></ErrorBoundary>} />
              <Route path="*" element={<PageError C={C} />} />
            </Routes>
        </main>
      </div>

      <CommandPalette
        isOpen={isCmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onNavigate={(path) => { navigate(path); setCmdPaletteOpen(false); }}
        C={C}
      />

      <GlobalAICopilot
        isOpen={isCopilotOpen}
        onClose={() => setCopilotOpen(false)}
        C={C}
      />

      <ToastContainer />
    </div>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, login } = useAuth();
  const { C } = useTheme();

  if (!isAuthenticated) {
    return <LoginGate onAuthenticate={(usr, pwd) => login(usr, pwd)} C={C} />;
  }

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <AuthenticatedApp />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

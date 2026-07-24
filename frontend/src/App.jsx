import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { AppProvider, useApp } from "./contexts/AppContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import LoginGate from "./components/LoginGate";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import CommandPalette from "./components/layout/CommandPalette";
import GlobalAICopilot from "./components/GlobalAICopilot";

// Static imports for instant 0ms tab switching
import DashboardPage from "./components/pages/DashboardPage";
import RepositoriesPage from "./components/pages/RepositoriesPage";
import RepositoryWorkspacePage from "./components/pages/RepositoryWorkspacePage";
import PipelinesPage from "./components/pages/PipelinesPage";
import DeploymentsPage from "./components/pages/DeploymentsPage";
import FindingsPage from "./components/pages/FindingsPage";
import PoliciesPage from "./components/pages/PoliciesPage";
import ObservabilityPage from "./components/pages/ObservabilityPage";
import ReportsPage from "./components/pages/ReportsPage";
import AICopilotWorkspacePage from "./components/pages/AICopilotWorkspacePage";
import SettingsPage from "./components/pages/SettingsPage";

function PageLoader({ C }) {
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{
          height: i === 1 ? 32 : 120, borderRadius: 12,
          background: C?.skeleton || "rgba(255,255,255,0.04)",
        }} />
      ))}
    </div>
  );
}

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
  const { scans, repositories, deployments, findings, metrics, wsConnected, loading, error, fetchAllData } = useApp();
  const navigate = useNavigate();
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCmdPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: C.bg, color: C.ink,
      fontFamily: C.sans,
    }}>
      <Sidebar C={C} scansCount={scans.length} openFindingsCount={findings.length} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden" }}>
        <TopBar
          C={C}
          repositories={repositories}
          wsConnected={wsConnected}
          onOpenCommandPalette={() => setIsCmdPaletteOpen(true)}
          onRescan={fetchAllData}
          onToggleCopilot={() => setIsCopilotOpen(prev => !prev)}
        />

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
          {loading ? (
            <PageLoader C={C} />
          ) : (
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={
                <DashboardPage scans={scans} repositories={repositories} metrics={metrics} C={C} />
              } />
              <Route path="/repositories" element={
                <RepositoriesPage
                  repositories={repositories} C={C}
                  onSelectRepo={(repo) => { setSelectedRepo(repo); navigate("/repositories/workspace"); }}
                />
              } />
              <Route path="/repositories/workspace" element={
                <RepositoryWorkspacePage repo={selectedRepo} scans={scans} onBack={() => navigate("/repositories")} C={C} />
              } />
              <Route path="/pipelines" element={<PipelinesPage scans={scans} C={C} />} />
              <Route path="/deployments" element={<DeploymentsPage deployments={deployments} C={C} />} />
              <Route path="/findings" element={<FindingsPage findings={findings} C={C} />} />
              <Route path="/policies" element={<PoliciesPage C={C} />} />
              <Route path="/observability" element={<ObservabilityPage metrics={metrics} C={C} />} />
              <Route path="/reports" element={<ReportsPage C={C} />} />
              <Route path="/copilot" element={<AICopilotWorkspacePage scans={scans} C={C} />} />
              <Route path="/settings" element={<SettingsPage C={C} />} />
              <Route path="*" element={<PageError C={C} />} />
            </Routes>
          )}
        </main>
      </div>

      <CommandPalette
        isOpen={isCmdPaletteOpen}
        onClose={() => setIsCmdPaletteOpen(false)}
        onNavigate={(path) => { navigate(path); setIsCmdPaletteOpen(false); }}
        C={C}
      />

      <GlobalAICopilot
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        C={C}
      />
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
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

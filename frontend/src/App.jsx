import React, { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useScanWebSocket } from "./hooks/useScanWebSocket";
import { useScans } from "./hooks/useApi";
import { useUIStore } from "./stores/uiStore";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastContainer from "./components/ToastContainer";

import LoginGate from "./components/LoginGate";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import CommandPalette from "./components/layout/CommandPalette";
import NotificationDrawer from "./components/layout/NotificationDrawer";
import GlobalAICopilot from "./components/GlobalAICopilot";
import CyberLoader from "./components/shared/CyberLoader";

// Primary Enterprise Workspaces & Pages
const OverviewWorkspace = lazy(() => import("./features/overview/OverviewWorkspace"));
const RepositoriesPage = lazy(() => import("./features/repositories/RepositoriesPage"));
const RepositoryDetailPage = lazy(() => import("./features/repositories/RepositoryDetailPage"));
const PipelinesPage = lazy(() => import("./features/pipelines/PipelinesPage"));
const PipelineDetailPage = lazy(() => import("./features/pipelines/PipelineDetailPage"));
const SecurityCenterWorkspace = lazy(() => import("./features/security/SecurityCenterWorkspace"));
const DeploymentsPage = lazy(() => import("./features/deployments/DeploymentsPage"));
const ObservabilityPage = lazy(() => import("./features/observability/ObservabilityPage"));
const PolicyWorkspace = lazy(() => import("./components/pages/PolicyWorkspace"));
const SettingsWorkspace = lazy(() => import("./features/settings/SettingsWorkspace"));
const NotificationsPage = lazy(() => import("./features/notifications/NotificationsPage"));

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
        onClick={() => window.location.href = "/overview"}
        style={{
          padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
          background: C?.accent || "#6366F1", color: "#fff", fontWeight: 600, fontSize: 13,
        }}
      >Back to Overview</button>
    </div>
  );
}

function RouteFallback() {
  return <CyberLoader size="md" />;
}

function AppShell() {
  const { C } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const { error, refetch } = useScans();
  const { isCmdPaletteOpen, setCmdPaletteOpen, isCopilotOpen, setCopilotOpen, toggleCmdPalette } = useUIStore();

  // Trigger cyber loader animation on every route/page change
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // New TanStack Query-powered WebSocket (exponential backoff + cache invalidation)
  useScanWebSocket();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleCmdPalette();
      }
    };
    const navHandler = (e) => {
      navigate(e.detail);
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("sf_navigate", navHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("sf_navigate", navHandler);
    };
  }, [toggleCmdPalette, navigate]);

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
            <button onClick={() => refetch()} style={{
              marginLeft: "auto", padding: "4px 12px", borderRadius: 6, border: `1px solid ${C.redBorder}`,
              background: "transparent", color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>Retry</button>
          </div>
        )}

        <main style={{ flex: 1, padding: 24, overflowY: "auto", background: C.bg, position: "relative" }}>
          {isNavigating ? (
            <CyberLoader size="md" />
          ) : (
            <Suspense fallback={<RouteFallback />}>
              <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<ErrorBoundary><OverviewWorkspace /></ErrorBoundary>} />
              <Route path="/repositories" element={<ErrorBoundary><RepositoriesPage /></ErrorBoundary>} />
              <Route path="/repositories/:id" element={<ErrorBoundary><RepositoryDetailPage /></ErrorBoundary>} />
              <Route path="/pipelines" element={<ErrorBoundary><PipelinesPage /></ErrorBoundary>} />
              <Route path="/pipelines/:id" element={<ErrorBoundary><PipelineDetailPage /></ErrorBoundary>} />
              <Route path="/security-center" element={<ErrorBoundary><SecurityCenterWorkspace /></ErrorBoundary>} />
              <Route path="/deployments" element={<ErrorBoundary><DeploymentsPage /></ErrorBoundary>} />
              <Route path="/observability" element={<ErrorBoundary><ObservabilityPage /></ErrorBoundary>} />
              <Route path="/policies" element={<ErrorBoundary><PolicyWorkspace /></ErrorBoundary>} />
              <Route path="/settings" element={<ErrorBoundary><SettingsWorkspace /></ErrorBoundary>} />
              <Route path="/notifications" element={<ErrorBoundary><NotificationsPage /></ErrorBoundary>} />

              {/* Legacy Route Redirects */}
              <Route path="/mission-control" element={<Navigate to="/overview" replace />} />
              <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
              <Route path="/findings" element={<Navigate to="/security-center" replace />} />
              <Route path="/reports" element={<Navigate to="/security-center" replace />} />
              <Route path="/copilot" element={<Navigate to="/overview" replace />} />
              <Route path="*" element={<PageError C={C} />} />
            </Routes>
          </Suspense>
          )}
        </main>
      </div>

      <CommandPalette
        isOpen={isCmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onNavigate={(path) => { navigate(path); setCmdPaletteOpen(false); }}
        C={C}
      />

      <NotificationDrawer />

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

  return <AppShell />;
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

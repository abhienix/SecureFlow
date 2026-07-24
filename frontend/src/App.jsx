import React, { useState, useEffect, useCallback, useRef } from "react";
import { THEMES, BACKEND } from "./theme";
import { normaliseScan } from "./utils/formatters";

import LoginGate from "./components/LoginGate";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import CommandPalette from "./components/layout/CommandPalette";

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

import RegisterRepoModal from "./components/modals/ScanDetailModal"; // reusing clean modal if needed

export default function App() {
  const [themeMode] = useState("dark");
  const C = THEMES.dark;

  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem("sf_auth") === "true");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [scans, setScans] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [findings, setFindings] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedRepoFilter, setSelectedRepoFilter] = useState("all");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("main");
  const [activeRepoDetail, setActiveRepoDetail] = useState(null);
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);

  // Fetch all backend APIs
  const fetchAllData = useCallback(async () => {
    try {
      const [scansRes, reposRes, depsRes, findingsRes, metricsRes] = await Promise.all([
        fetch(`${BACKEND}/api/scan-results`).then(r => r.json()).catch(() => ({ scans: [] })),
        fetch(`${BACKEND}/api/repositories`).then(r => r.json()).catch(() => ({ repositories: [] })),
        fetch(`${BACKEND}/api/deployments`).then(r => r.json()).catch(() => ({ deployments: [] })),
        fetch(`${BACKEND}/api/findings`).then(r => r.json()).catch(() => ({ findings: [] })),
        fetch(`${BACKEND}/api/observability/metrics`).then(r => r.json()).catch(() => ({}))
      ]);

      const rawScans = Array.isArray(scansRes) ? scansRes : (scansRes.scans || []);
      setScans(rawScans.map(normaliseScan));
      setRepositories(reposRes.repositories || []);
      setDeployments(depsRes.deployments || []);
      setFindings(findingsRes.findings || []);
      setMetrics(metricsRes || {});
      setWsConnected(true);
    } catch (e) {
      console.error("API sync error:", e);
      setWsConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 6000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  if (!isAuthenticated) {
    return (
      <LoginGate
        onAuthenticate={() => {
          setIsAuthenticated(true);
          sessionStorage.setItem("sf_auth", "true");
        }}
        C={C}
      />
    );
  }

  const handleSelectRepo = (repoObj) => {
    setActiveRepoDetail(repoObj);
    setActiveTab("repository_workspace");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bgBase || "#0A0B0D", color: C.textPrimary || "#F1F5F9" }}>
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== "repository_workspace") setActiveRepoDetail(null);
        }}
        scansCount={scans.length}
        openFindingsCount={findings.length}
        C={C}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden" }}>
        {/* Top Navigation & Bar */}
        <TopBar
          repositories={repositories}
          selectedRepo={selectedRepoFilter}
          onSelectRepo={setSelectedRepoFilter}
          selectedBranch={selectedBranchFilter}
          onSelectBranch={setSelectedBranchFilter}
          onOpenCommandPalette={() => setIsCmdPaletteOpen(true)}
          onRescan={fetchAllData}
          onExport={() => setActiveTab("reports")}
          onAskAI={() => setActiveTab("copilot")}
          wsConnected={wsConnected}
          C={C}
        />

        {/* Dynamic Workspace Container */}
        <main style={{ flex: 1, padding: "24px", overflowY: "auto", background: C.bgBase || "#0A0B0D" }}>
          {activeTab === "dashboard" && (
            <DashboardPage scans={scans} repositories={repositories} metrics={metrics} C={C} onNavigate={setActiveTab} />
          )}

          {activeTab === "repositories" && (
            <RepositoriesPage
              repositories={repositories}
              onSelectRepo={handleSelectRepo}
              onRegisterRepo={() => setActiveTab("repositories")}
              C={C}
            />
          )}

          {activeTab === "repository_workspace" && (
            <RepositoryWorkspacePage
              repo={activeRepoDetail}
              scans={scans}
              onBack={() => setActiveTab("repositories")}
              C={C}
            />
          )}

          {activeTab === "pipelines" && (
            <PipelinesPage scans={scans} C={C} />
          )}

          {activeTab === "deployments" && (
            <DeploymentsPage deployments={deployments} C={C} />
          )}

          {activeTab === "findings" && (
            <FindingsPage findings={findings} C={C} />
          )}

          {activeTab === "policies" && (
            <PoliciesPage C={C} />
          )}

          {activeTab === "observability" && (
            <ObservabilityPage metrics={metrics} C={C} />
          )}

          {activeTab === "reports" && (
            <ReportsPage C={C} />
          )}

          {activeTab === "copilot" && (
            <AICopilotWorkspacePage scans={scans} C={C} />
          )}

          {activeTab === "settings" && (
            <SettingsPage C={C} />
          )}
        </main>
      </div>

      {/* Global Command Palette (⌘K / Ctrl+K) */}
      <CommandPalette
        isOpen={isCmdPaletteOpen}
        onClose={() => setIsCmdPaletteOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
        C={C}
      />
    </div>
  );
}

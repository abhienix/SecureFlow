import { Routes, Route } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { OverviewPage } from "./features/overview/OverviewPage";
import { PipelinesPage } from "./features/pipelines/PipelinesPage";
import { SecurityPage } from "./features/security/SecurityPage";
import { RepositoriesPage } from "./features/repositories/RepositoriesPage";
import { DeploymentsPage } from "./features/deployments/DeploymentsPage";
import { PoliciesPage } from "./features/policies/PoliciesPage";
import { CopilotPage } from "./features/copilot/CopilotPage";
import { SettingsPage } from "./features/settings/SettingsPage";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/pipelines" element={<PipelinesPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/repositories" element={<RepositoriesPage />} />
        <Route path="/deployments" element={<DeploymentsPage />} />
        <Route path="/policies" element={<PoliciesPage />} />
        <Route path="/copilot" element={<CopilotPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<OverviewPage />} />
      </Routes>
    </AppShell>
  );
}

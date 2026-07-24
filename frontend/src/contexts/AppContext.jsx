import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { normaliseScan } from "../utils/formatters";

const BACKEND = "https://secureflow-backend-1083585992526.us-central1.run.app";
const WS_URL = BACKEND.replace("https://", "wss://").replace("http://", "ws://") + "/ws/scans";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [scans, setScans] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [findings, setFindings] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const addNotification = useCallback((notification) => {
    const n = { id: Date.now(), timestamp: new Date(), ...notification };
    setNotifications(prev => [n, ...prev].slice(0, 50));
  }, []);

  // Fetch all data from backend APIs
  const fetchAllData = useCallback(async () => {
    try {
      const [scansRes, reposRes, depsRes, findingsRes, metricsRes] = await Promise.all([
        fetch(`${BACKEND}/api/scan-results`).then(r => r.json()).catch(() => ({ scans: [] })),
        fetch(`${BACKEND}/api/repositories`).then(r => r.json()).catch(() => ({ repositories: [] })),
        fetch(`${BACKEND}/api/deployments`).then(r => r.json()).catch(() => ({ deployments: [] })),
        fetch(`${BACKEND}/api/findings`).then(r => r.json()).catch(() => ({ findings: [] })),
        fetch(`${BACKEND}/api/observability/metrics`).then(r => r.json()).catch(() => ({})),
      ]);

      const rawScans = Array.isArray(scansRes) ? scansRes : (scansRes.scans || []);
      setScans(rawScans.map(normaliseScan));
      setRepositories(reposRes.repositories || []);
      setDeployments(depsRes.deployments || []);
      setFindings(findingsRes.findings || []);
      setMetrics(metricsRes || {});
      setError(null);
    } catch (e) {
      console.error("API sync error:", e);
      setError("Failed to connect to SecureFlow backend. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket connection with auto-reconnect
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        console.log("[WS] Connected to SecureFlow backend");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "ping") return;

          // Update scans based on WS event type
          if (data.type === "scan_complete" || data.type === "scan_started" || data.type === "scan_timeout" || data.type === "scan_progress") {
            if (data.type === "scan_complete" || data.type === "scan_started") {
              setScans(prev => {
                const idx = prev.findIndex(s => s.id === data.id);
                const normalized = normaliseScan(data);
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = normalized;
                  return updated;
                }
                return [normalized, ...prev];
              });
            }

            if (data.type === "scan_complete") {
              addNotification({
                type: data.action_taken === "BLOCK" ? "error" : "success",
                title: `Pipeline ${data.action_taken === "BLOCK" ? "Blocked" : "Passed"}`,
                message: `${data.repo_name} — ${(data.commit_sha || "").substring(0, 8)}`,
              });
            }
          }

          if (data.type === "dast_update") {
            setScans(prev => prev.map(s => s.id === data.id ? { ...s, ...data } : s));
          }
        } catch (e) {
          console.warn("[WS] Parse error:", e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
        // Auto-reconnect after 5 seconds
        reconnectTimer.current = setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    } catch (e) {
      console.warn("[WS] Connection failed:", e);
      setWsConnected(false);
      reconnectTimer.current = setTimeout(connectWebSocket, 5000);
    }
  }, [addNotification]);

  // Initial data load + WebSocket connection
  useEffect(() => {
    fetchAllData();
    connectWebSocket();

    // Fallback polling every 30s (not 6s) as backup for WS
    const interval = setInterval(fetchAllData, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [fetchAllData, connectWebSocket]);

  const value = {
    scans, repositories, deployments, findings, metrics,
    loading, error, wsConnected, notifications,
    fetchAllData, addNotification,
    BACKEND,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export { BACKEND };
export default AppContext;

/**
 * SecureFlow — Shared TypeScript Types
 * Mirrors the backend API response shapes from main.py
 */

// ─── Core Enums ─────────────────────────────────────────────────────

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAN' | 'UNKNOWN';
export type ActionTaken = 'ALLOW' | 'BLOCK' | 'SKIPPED' | 'UNKNOWN';
export type ScanStatus = 'running' | 'complete' | 'timeout' | 'superseded' | 'cancelled';
export type DastStatus = 'not_queued' | 'queued' | 'running' | 'completed' | 'failed' | 'queue_failed';

// ─── Scanner Finding Types ──────────────────────────────────────────

export interface GitleaksFinding {
  RuleID?: string;
  rule?: string;
  File?: string;
  file?: string;
  StartLine?: number;
  startLine?: number;
  Description?: string;
  description?: string;
  Secret?: string;
  secret?: string;
}

export interface SemgrepFinding {
  check_id: string;
  rule_id?: string;
  path: string;
  start?: { line: number; col?: number };
  extra?: {
    message: string;
    severity: string;
    metadata?: Record<string, unknown>;
  };
}

export interface TrivyVulnerability {
  VulnerabilityID: string;
  PkgName: string;
  InstalledVersion?: string;
  FixedVersion?: string;
  Severity: string;
  Title?: string;
  Description?: string;
  CVSS?: {
    nvd?: { V3Score?: number; V2Score?: number };
    redhat?: { V3Score?: number; V2Score?: number };
  };
}

export interface TrivyResult {
  Target: string;
  Type?: string;
  Vulnerabilities?: TrivyVulnerability[];
}

export interface ZapAlert {
  alert: string;
  risk: string;
  pluginId?: string;
  url?: string;
  description?: string;
  solution?: string;
}

export interface ZapFindings {
  site?: { '@name': string }[];
  alerts?: ZapAlert[];
}

// ─── Pipeline Step ──────────────────────────────────────────────────

export interface PipelineStep {
  result: string;
  detail: string;
}

export type PipelineSteps = Record<string, PipelineStep>;

// ─── Scan Result (main entity) ──────────────────────────────────────

export interface ScanResult {
  id: number;
  commit_sha: string;
  commit_message: string;
  repo_name: string;
  branch: string;
  scan_type: string;
  severity: Severity;
  findings: {
    gitleaks?: GitleaksFinding[];
    semgrep?: SemgrepFinding[];
    Results?: TrivyResult[];
    zap?: ZapFindings;
  };
  ai_explanation: string;
  ai_fix: string;
  risk_score: number | null;
  action_taken: ActionTaken;
  pipeline_steps: PipelineSteps;
  status: ScanStatus;
  started_at: string | null;
  created_at: string;
  ai_confidence?: number | null;
  ai_feedback?: string | null;
  // DAST telemetry
  dast_status: DastStatus;
  target_url?: string | null;
  deployment_url?: string | null;
  zap_findings?: ZapFindings | null;
  zap_summary?: { high: number; medium: number; low: number; info: number } | null;
  queued_at?: string | null;
  dast_started_at?: string | null;
  dast_completed_at?: string | null;
  scan_duration?: number | null;
  worker_name?: string | null;
  worker_id?: string | null;
  queue_error?: string | null;
  zap_report_path?: string | null;
}

export interface ScansResponse {
  total: number;
  limit: number;
  scans: ScanResult[];
}

// ─── Repository ─────────────────────────────────────────────────────

export interface Repository {
  id: number;
  name: string;
  repo_name: string;
  owner: string;
  default_branch: string;
  status: string;
  total_scans: number;
  last_scan_at: string;
  last_dast_status: DastStatus;
  security_score: number;
  open_findings: number;
  url: string;
}

export interface RepositoriesResponse {
  repositories: Repository[];
  total: number;
}

// ─── Deployment ─────────────────────────────────────────────────────

export interface Deployment {
  id: string;
  run_id: number;
  repo_name: string;
  commit_sha: string;
  branch: string;
  environment: string;
  service_name: string;
  revision: string;
  url: string;
  status: string;
  dast_status: DastStatus;
  ai_verdict: ActionTaken;
  created_at: string;
}

export interface DeploymentsResponse {
  deployments: Deployment[];
  total: number;
}

// ─── Unified Finding ────────────────────────────────────────────────

export interface UnifiedFinding {
  id: string;
  scanner: string;
  category: string;
  title: string;
  severity: Severity;
  repo_name: string;
  branch: string;
  file: string;
  line: number;
  cve_cwe: string;
  owasp: string;
  status: string;
  created_at: string;
  ai_explanation: string;
  ai_fix: string;
}

export interface FindingsResponse {
  findings: UnifiedFinding[];
  total: number;
}

// ─── Observability Metrics ──────────────────────────────────────────

export interface DastPipelineMetrics {
  enabled: boolean;
  broker_host: string;
  worker_queue: string;
  default_target_url: string;
  queued_jobs: number;
  running_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  avg_duration_seconds: number;
}

export interface ObservabilityMetrics {
  total_scans: number;
  dast_pipeline: DastPipelineMetrics;
}

// ─── WebSocket Events ───────────────────────────────────────────────

export type WSMessageType =
  | 'scan_complete'
  | 'scan_started'
  | 'scan_timeout'
  | 'scan_progress'
  | 'scan_reanalyzed'
  | 'dast_update'
  | 'ping';

export interface WSEvent {
  type: WSMessageType;
  id?: number;
  run_id?: number;
  action_taken?: ActionTaken;
  repo_name?: string;
  commit_sha?: string;
  pipeline_steps?: PipelineSteps;
  status?: ScanStatus;
  [key: string]: unknown;
}

// ─── Persona Types ──────────────────────────────────────────────────

export type Persona = 'executive' | 'secops' | 'developer';

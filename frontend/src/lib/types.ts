export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type ActionTaken = "ALLOW" | "BLOCK" | "UNKNOWN";

export type ScanStatus = "running" | "complete" | "timeout" | "superseded";

export type DastStatus =
  | "not_queued"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "queue_failed";

export interface ScanResult {
  id: number;
  commit_sha: string | null;
  commit_message: string | null;
  repo_name: string | null;
  branch: string | null;
  scan_type: string | null;
  severity: Severity | null;
  ai_explanation: string | null;
  ai_fix: string | null;
  risk_score: number | null;
  action_taken: ActionTaken | null;
  findings: Record<string, unknown> | null;
  pipeline_steps: Record<string, unknown> | null;
  status: ScanStatus | null;
  started_at: string | null;
  created_at: string | null;
  ai_confidence: number | null;
  ai_feedback: string | null;
  dast_status: DastStatus | null;
  target_url: string | null;
  deployment_url: string | null;
  zap_findings: unknown;
  zap_summary: unknown;
  queued_at: string | null;
  dast_started_at: string | null;
  dast_completed_at: string | null;
  scan_duration: number | null;
  worker_name: string | null;
  worker_id: string | null;
  queue_error: string | null;
  zap_report_path: string | null;
}

export interface ScanResultsResponse {
  total: number;
  limit: number;
  scans: ScanResult[];
}

export interface OpenFindings {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface DastPipeline {
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

export interface ObservabilityOverview {
  total_repositories: number;
  security_score: number;
  active_pipelines: number;
  total_deployments: number;
  deployment_success_rate: number;
  mean_pipeline_duration_seconds: number;
  open_findings: OpenFindings;
  infrastructure_status: string;
  dast_pipeline: DastPipeline;
}

export interface V1ObservabilityOverview {
  total_repositories: number;
  total_pipelines: number;
  active_pipelines: number;
  security_score: number;
  deployment_success_rate: number;
  mean_pipeline_duration_seconds: number;
  total_findings: number;
  open_findings: number;
  repository_health_pct: number;
  infrastructure_status: string;
}

export interface Repository {
  id: number;
  name: string;
  repo_name: string;
  owner: string;
  default_branch: string;
  status: string;
  total_scans: number;
  last_scan_at: string | null;
  last_dast_status: DastStatus;
  security_score: number;
  open_findings: number;
  url: string;
}

export interface RepositoriesResponse {
  repositories: Repository[];
  total: number;
}

export interface Deployment {
  id: string;
  run_id: number;
  repo_name: string | null;
  commit_sha: string;
  branch: string | null;
  environment: string;
  service_name: string;
  revision: string;
  url: string | null;
  status: string;
  dast_status: DastStatus;
  ai_verdict: ActionTaken;
  created_at: string | null;
}

export interface DeploymentsResponse {
  deployments: Deployment[];
  total: number;
}

export interface Finding {
  id: string;
  scanner: "gitleaks" | "semgrep" | "trivy" | "zap";
  category: string;
  title: string;
  severity: Severity;
  repo_name: string | null;
  branch: string | null;
  file: string;
  line: number;
  cve_cwe: string;
  owasp: string;
  status: string;
  created_at: string | null;
  ai_explanation: string;
  ai_fix: string;
}

export interface FindingsResponse {
  findings: Finding[];
  total: number;
}

export interface PolicyRule {
  id: number;
  name: string;
  severity: Severity;
  action: "BLOCK" | "WARN";
  scanner: string;
}

export interface PolicyResponse {
  policy: Record<string, unknown>;
  rules: PolicyRule[];
}

export interface CopilotResponse {
  answer: string;
}

export interface SearchResult {
  id?: number | string;
  type: string;
  title: string;
  subtitle?: string;
  path?: string;
  badge?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

export interface HealthComponent {
  name: string;
  status: string;
  latency_ms?: number;
  active_workers?: number;
  rate_limit_remaining?: number;
  webhook_configured?: boolean;
  model?: string;
}

export interface SystemHealth {
  status: string;
  components: Record<string, HealthComponent>;
  pipeline_stages: { id: string; name: string; status: string }[];
}

export interface SystemInfo {
  frontend_version: string;
  backend_version: string;
  build_number: string;
  environment: string;
  database_version: string;
  redis_status: string;
  worker_status: string;
}

export interface SlackStatus {
  configured: boolean;
  channel: string;
  webhook_preview: string;
}

export interface PipelineStageSummary {
  name: string;
  stage_key: string;
  order_index: number;
  status: string;
}

export interface PipelineStep {
  id: string;
  name: string;
  status: string;
  duration: string | null;
  exit_code: number | null;
}

export interface PipelineStageDetail {
  id: string;
  name: string;
  stage_key: string;
  order_index: number;
  status: string;
  duration: string | null;
  detail: string | null;
  exit_code: number | null;
  started_at: string | null;
  ended_at: string | null;
  steps: PipelineStep[];
}

export interface PipelineRun {
  id: string;
  run_number: number | null;
  repo_name: string;
  commit_sha: string | null;
  commit_message: string | null;
  branch: string | null;
  status: string;
  action_taken: ActionTaken | null;
  started_at: string | null;
  created_at: string | null;
  duration: number | null;
  stages: PipelineStageSummary[];
}

export interface PipelineDetail extends Omit<PipelineRun, "stages"> {
  stages: PipelineStageDetail[];
}

export interface LatestPipeline {
  id: string | number;
  run_number: number | null;
  commit_sha: string | null;
  status: string;
  stages: (PipelineStageDetail & {
    steps?: { id: string; name: string; status: string; duration: string | null }[];
  })[];
}

export interface SecuritySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
  last_scan_at: string | null;
}

export interface TrendPoint {
  day: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ScannerComparison {
  [scanner: string]: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface PipelineProgress {
  id: number;
  status: string | null;
  dast_status: DastStatus;
  pipeline_steps: Record<string, unknown>;
  action_taken: ActionTaken | null;
  risk_score: number | null;
}

export interface ScanBroadcast {
  type: string;
  id?: number;
  commit_sha?: string | null;
  commit_message?: string | null;
  repo_name?: string | null;
  branch?: string | null;
  scan_type?: string | null;
  severity?: Severity | null;
  ai_explanation?: string | null;
  ai_fix?: string | null;
  risk_score?: number | null;
  action_taken?: ActionTaken | null;
  pipeline_steps?: Record<string, unknown>;
  status?: string | null;
  started_at?: string | null;
  created_at?: string | null;
  dast_status?: DastStatus | null;
  target_url?: string | null;
  deployment_url?: string | null;
  run_id?: string;
  scan_id?: number;
  stage_key?: string;
}

export interface EventNotification {
  id?: string;
  type: string;
  message: string;
  source_link: string | null;
  severity: string;
  created_at: string | null;
}

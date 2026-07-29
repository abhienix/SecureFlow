export interface PipelineStep {
  result: string;
  detail: string;
}

export interface PipelineRun {
  id: number;
  run_id?: number;
  repo_name: string;
  commit_sha: string;
  branch: string;
  commit_message: string;
  scan_type: string;
  severity: string;
  action?: 'ALLOW' | 'BLOCK';
  action_taken?: 'ALLOW' | 'BLOCK';
  reason?: string;
  ai_explanation?: string;
  status: 'running' | 'complete' | 'timeout' | 'superseded';
  created_at: string;
  updated_at?: string;
  started_at?: string;
  duration?: number;
  pipeline_steps: {
    checkout?: PipelineStep;
    code_scan?: PipelineStep;
    docker?: PipelineStep;
    trivy?: PipelineStep;
    policy?: PipelineStep;
    deploy_staging?: PipelineStep;
    zap?: PipelineStep;
    zap_gate?: PipelineStep;
    deploy_prod?: PipelineStep;
  };
  gitleaks?: any[];
  semgrep?: { results: any[] };
  zap_findings?: any;
  findings?: any;
}

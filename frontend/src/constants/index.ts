export const ROUTES = {
  OVERVIEW: '/overview',
  REPOSITORIES: '/repositories',
  REPOSITORY_DETAIL: '/repositories/:id',
  PIPELINES: '/pipelines',
  PIPELINE_DETAIL: '/pipelines/:id',
  SECURITY: '/security',
  DEPLOYMENTS: '/deployments',
  OBSERVABILITY: '/observability',
  POLICIES: '/policies',
  SETTINGS: '/settings',
  NOTIFICATIONS: '/notifications',
};

export const PROMETHEUS_QUERIES = {
  CPU_USAGE: 'avg(rate(container_cpu_usage_seconds_total[1m]))*100',
  MEMORY_USAGE: 'container_memory_usage_bytes / container_spec_memory_limit_bytes * 100',
  API_LATENCY_P99: 'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))',
  REQUEST_RATE: 'sum(rate(http_requests_total[1m]))',
  ERROR_RATE: 'sum(rate(http_requests_total{status=~"5.."}[1m])) / sum(rate(http_requests_total[1m]))*100',
  REDIS_QUEUE_DEPTH: 'celery_queue_length',
  WORKER_ACTIVE_TASKS: 'celery_workers_active',
  DB_CONNECTIONS: 'pg_stat_activity_count{state="active"}',
  CLOUD_RUN_INSTANCES: 'custom_cloud_run_instance_count',
  PROMETHEUS_TARGETS: 'count(up == 1)',
  NETWORK_IN: 'sum(rate(container_network_receive_bytes_total[1m]))',
  NETWORK_OUT: 'sum(rate(container_network_transmit_bytes_total[1m]))',
};

export const STATUS_COLORS = {
  success: { token: '--success', label: '#10B981', name: 'passing' },
  running: { token: '--accent', label: '#6366F1', name: 'in-progress' },
  warning: { token: '--warning', label: '#F59E0B', name: 'degraded' },
  failed: { token: '--danger', label: '#EF4444', name: 'error' },
  cancelled: { token: '--text-muted', label: '#94A3B8', name: 'cancelled' },
  queued: { token: '--info', label: '#3B82F6', name: 'pending' },
  unknown: { token: '--text-muted', label: '#94A3B8', name: 'no data' },
  critical: { token: 'critical', label: '#7C3AED', name: 'critical' },
};

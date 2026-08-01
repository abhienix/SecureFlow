# Observability & Metrics Guide

This document covers Prometheus metric collection setups.

## 1. Metrics Endpoint
The FastAPI gateway exports metric summaries to `/api/v1/metrics/query` and exposes scraped pipeline and worker state values. A Prometheus query range endpoint is available at `/api/v1/metrics/range`.

## 2. Key Telemetry Variables
*   `scan_duration`: Tracks execution duration for individual scans.
*   `dast_status`: Tracks ZAP scan lifecycle state per run.
*   `active_workers`: Celery pool health agent reports active worker VM counts.
*   `queue_depth`: Redis queue depth for pending DAST tasks.

## 3. Alert Rules
Alerts are served from `/api/v1/alerts`:
*   `CeleryWorkerCPUWarning`: Fires when average worker CPU exceeds 80%.
*   `DASTScanTimeout`: Fires when a DAST task has been running for more than 30 minutes.

## 4. System Topology
The live service topology map is available at `/api/v1/topology`, showing real-time connection states between the gateway, Redis, worker, and database.

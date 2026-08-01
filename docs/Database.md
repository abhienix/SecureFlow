# Database Architecture Guide

This document covers schema definitions, indices, and connection pooling.

## 1. Table Registry
*   `repositories`: Tracks repository names, branch patterns, and URLs.
*   `pipeline_runs`: Logs run numbers, SHA keys, status states, and action results.
*   `pipeline_stages`: Tracks individual stage progress within a run.
*   `security_findings`: Stores scanner names (trivy, semgrep, zap), CVSS categories, and line numbers.
*   `deployments`: Records Cloud Run deployment revisions per environment.
*   `policies`: Stores policy rule definitions and enforcement modes.
*   `notifications`: Stores user-facing security alerts and pipeline events.

## 2. Indices & Performance
*   Partial unique constraint `ix_scan_unique_active` ensures only one active run exists per commit+repo+branch, allowing superseded runs to coexist.
*   SQLite fallback resolves async dialect parameters gracefully on local developer machines.

## 3. Connection Pooling
*   **Local**: SQLite with `aiosqlite` async driver.
*   **Cloud**: PostgreSQL with `asyncpg` driver via `DATABASE_URL` environment variable.

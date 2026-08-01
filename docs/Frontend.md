# Frontend Developer Guide

This document covers the React + TypeScript frontend dashboard architecture of SecureFlow.

## 1. Directory Structure
The frontend dashboard is located in `frontend/`:
*   `src/api/`: TS Axios API clients (e.g. `client.ts`, `pipelines.ts`, `metrics.ts`).
*   `src/features/`: Workspace modules (Overview, Repositories, Pipelines, Security Center, Observability).
*   `src/components/`: Core UI components (Layouts, CommandPalette, Modals).
*   `src/hooks/`: Standard UI hooks (e.g., websocket listener, pipeline loader).
*   `src/stores/`: Zustand state stores (e.g. `uiStore`).

## 2. API Communication
All active pages call backend endpoints using TanStack Query hooks paired with the Axios client:
```typescript
import { client } from '../../api/client';
// Fetching a list of deployments:
const { data } = useQuery({
  queryKey: ['deployments'],
  queryFn: async () => {
    const res = await client.get('/deployments');
    return res.data;
  }
});
```

## 3. WebSockets
The client opens a WebSocket connection to the backend `/ws/events` path. It listens for real-time progress events and invalidates TanStack Query query caches dynamically to refresh dashboard state.

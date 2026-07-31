/**
 * Re-export of the consolidated useWebSocket hook.
 * Kept for backward compatibility — all WebSocket logic has been
 * consolidated into useWebSocket to prevent duplicate subscriptions.
 */
export { useWebSocket as useScanWebSocket } from './useWebSocket';

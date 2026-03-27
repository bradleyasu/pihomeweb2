/**
 * PiHome connection constants.
 *
 * In production the app is served by the PiHome device itself,
 * so we hardcode the hostname "pihome" (resolved via mDNS/Bonjour
 * on the local network). This matches the old app's approach and
 * avoids issues with window.location.hostname in PWA standalone mode.
 *
 * For local development (localhost), we point at localhost instead.
 */

const PIHOME_HOST = 'pihome';

/** Resolve the target host — localhost for dev, "pihome" for production */
function getHost(): string {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'localhost';
  return PIHOME_HOST;
}

/** Base URL for the PiHome HTTP API */
export function getApiBaseUrl(): string {
  return `http://${getHost()}:8989`;
}

/** WebSocket URL for real-time status updates */
export function getWsUrl(): string {
  return `ws://${getHost()}:8765`;
}

/** How often to request status over the websocket (ms) */
export const STATUS_POLL_INTERVAL = 1000;

/** WebSocket reconnect delay (ms) */
export const WS_RECONNECT_DELAY = 5000;

/** App version */
export const APP_VERSION = '3.14.0';

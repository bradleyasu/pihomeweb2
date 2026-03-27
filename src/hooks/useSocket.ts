/**
 * WebSocket hook for real-time PiHome status updates.
 *
 * Connects to the PiHome websocket, sends periodic status requests,
 * and exposes a `sendPayload` function for sending arbitrary messages.
 *
 * Persists the last known status to localStorage so the app can
 * render a cached view when the PiHome device is unreachable
 * (e.g. phone is off the home network).
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import type { PiHomeStatus, EventPayload } from '../types/index.ts';
import { getWsUrl, STATUS_POLL_INTERVAL, WS_RECONNECT_DELAY } from '../constants.ts';

const CACHE_KEY = 'pihome:last-status';

/** Read cached status from localStorage */
function loadCachedStatus(): PiHomeStatus | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.type === 'status' ? (parsed as PiHomeStatus) : null;
  } catch {
    return null;
  }
}

/** Persist status to localStorage */
function cacheStatus(status: PiHomeStatus): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(status));
  } catch {
    // Storage full or unavailable — ignore
  }
}

interface UseSocketReturn {
  /** Latest status received from the server (or cached if offline) */
  status: PiHomeStatus | null;
  /** Whether the websocket is currently connected */
  online: boolean;
  /** Whether the current status is from cache (stale) */
  stale: boolean;
  /** Send an arbitrary JSON payload over the websocket */
  sendPayload: (payload: EventPayload) => void;
}

export function useSocket(): UseSocketReturn {
  const [status, setStatus] = useState<PiHomeStatus | null>(loadCachedStatus);
  const [online, setOnline] = useState(false);
  const [stale, setStale] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Send a JSON payload if the socket is open */
  const sendPayload = useCallback((payload: EventPayload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  useEffect(() => {
    let unmounted = false;

    function connect() {
      if (unmounted) return;

      const wsUrl = getWsUrl();
      console.debug('[WS] Connecting to', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setOnline(true);
        // Start polling for status
        intervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'status' }));
          }
        }, STATUS_POLL_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'status') {
            const s = data as PiHomeStatus;
            setStatus(s);
            setStale(false);
            cacheStatus(s);
          }
        } catch {
          // Ignore non-JSON messages
        }
      };

      ws.onclose = () => {
        setOnline(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        // Auto-reconnect
        if (!unmounted) {
          reconnectRef.current = setTimeout(connect, WS_RECONNECT_DELAY);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, []);

  return { status, online, stale, sendPayload };
}

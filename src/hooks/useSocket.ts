/**
 * WebSocket hook for real-time PiHome status updates.
 *
 * Connects to the PiHome websocket, sends periodic status requests,
 * and exposes a `sendPayload` function for sending arbitrary messages.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import type { PiHomeStatus, EventPayload } from '../types/index.ts';
import { getWsUrl, STATUS_POLL_INTERVAL, WS_RECONNECT_DELAY } from '../constants.ts';

interface UseSocketReturn {
  /** Latest status received from the server */
  status: PiHomeStatus | null;
  /** Whether the websocket is currently connected */
  online: boolean;
  /** Send an arbitrary JSON payload over the websocket */
  sendPayload: (payload: EventPayload) => void;
}

export function useSocket(): UseSocketReturn {
  const [status, setStatus] = useState<PiHomeStatus | null>(null);
  const [online, setOnline] = useState(false);
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
            setStatus(data as PiHomeStatus);
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

  return { status, online, sendPayload };
}

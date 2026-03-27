/**
 * Global PiHome state provider.
 *
 * Wraps the websocket connection and exposes status + sendPayload
 * to the entire component tree via React context.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket.ts';
import type { PiHomeStatus, EventPayload } from '../types/index.ts';

interface PiHomeContextValue {
  status: PiHomeStatus | null;
  online: boolean;
  sendPayload: (payload: EventPayload) => void;
}

const PiHomeContext = createContext<PiHomeContextValue>({
  status: null,
  online: false,
  sendPayload: () => {},
});

/** Access the PiHome global state */
export function usePiHome() {
  return useContext(PiHomeContext);
}

export function PiHomeProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();

  return (
    <PiHomeContext.Provider value={socket}>
      {children}
    </PiHomeContext.Provider>
  );
}

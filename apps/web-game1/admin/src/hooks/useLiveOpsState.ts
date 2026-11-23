import { useEffect, useState } from 'react';
import { adminSocket } from '../services/socket';
import { LiveOpsAdminState } from '../types/liveOps';

/** Live-ops state pushed by the server to admin sockets; null until the first snapshot arrives. */
export function useLiveOpsState(): LiveOpsAdminState | null {
  const [state, setState] = useState<LiveOpsAdminState | null>(null);

  useEffect(() => {
    const unsubscribe = adminSocket.onLiveOpsState(setState);
    adminSocket.requestLiveOpsState();
    return unsubscribe;
  }, []);

  return state;
}

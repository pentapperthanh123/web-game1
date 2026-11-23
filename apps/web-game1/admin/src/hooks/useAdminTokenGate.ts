import { useCallback, useEffect, useState } from 'react';
import { adminSocket } from '../services/socket';
import { readAdminToken } from '../services/adminToken';

/** Tracks admin token presence and server auth errors for the token gate UI. */
export function useAdminTokenGate() {
  const [savedToken, setSavedToken] = useState<string>(readAdminToken);
  const [hasAuthError, setHasAuthError] = useState(false);
  const [isGateOpen, setIsGateOpen] = useState<boolean>(() => !readAdminToken());

  useEffect(() => {
    return adminSocket.onAuthError(() => {
      setHasAuthError(true);
      setIsGateOpen(true);
    });
  }, []);

  const saveToken = useCallback((token: string) => {
    adminSocket.updateAdminToken(token);
    setSavedToken(readAdminToken());
    setHasAuthError(false);
    setIsGateOpen(false);
  }, []);

  const clearToken = useCallback(() => {
    adminSocket.updateAdminToken('');
    setSavedToken('');
    setIsGateOpen(true);
  }, []);

  const openGate = useCallback(() => setIsGateOpen(true), []);
  const closeGate = useCallback(() => setIsGateOpen(false), []);

  return { savedToken, hasAuthError, isGateOpen, saveToken, clearToken, openGate, closeGate };
}

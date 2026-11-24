import { useEffect, useState } from 'react';
import { CLASH_NGROK, CLASH_PORTS } from '../../../shared/constants/clashConfig';

interface ClashPublicUrls {
  clientUrl: string | null;
  adminUrl: string | null;
}

/** True when the admin is opened directly on its dev port (localhost or a LAN IP), not via a tunnel. */
function isDirectAdminAccess(): boolean {
  return window.location.port === String(CLASH_PORTS.ADMIN);
}

/** Client URL on the same host as the admin (localhost / LAN IP), port 8030. */
function getSameHostClientUrl(): string {
  return `${window.location.protocol}//${window.location.hostname}:${CLASH_PORTS.CLIENT}`;
}

function getInitialClientUrl(): string {
  const configured = import.meta.env.VITE_CLASH_CLIENT_URL;
  if (configured) return configured;
  return getSameHostClientUrl();
}

/**
 * URL of the live stage (client) as seen from this admin:
 * - VITE_CLASH_CLIENT_URL if set;
 * - opened directly (localhost / LAN) → same host, port 8030;
 * - opened through ngrok → the `clash-client` tunnel's public URL, read via the admin dev server.
 */
export function useClashClientUrl(): string {
  const [clientUrl, setClientUrl] = useState<string>(getInitialClientUrl);

  useEffect(() => {
    if (import.meta.env.VITE_CLASH_CLIENT_URL || isDirectAdminAccess()) return;

    let isCancelled = false;
    fetch(CLASH_NGROK.PUBLIC_URLS_PATH, { cache: 'no-store' })
      .then((response) => (response.ok ? (response.json() as Promise<ClashPublicUrls>) : null))
      .then((urls) => {
        if (!isCancelled && urls?.clientUrl) setClientUrl(urls.clientUrl);
      })
      .catch(() => {
        // ngrok agent not reachable: keep the same-host fallback.
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return clientUrl;
}

/** Game server API path, called on the admin's own origin (proxied by Vite to port 4000). */
export function gameServerApi(path: string): string {
  return `/api${path.startsWith('/') ? path : `/${path}`}`;
}

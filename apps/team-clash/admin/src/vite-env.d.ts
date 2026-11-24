/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional fixed URL of the live stage (client), e.g. a reserved ngrok domain. */
  readonly VITE_CLASH_CLIENT_URL?: string;
  /** Game server origin for the /api proxy (default http://127.0.0.1:4000). */
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

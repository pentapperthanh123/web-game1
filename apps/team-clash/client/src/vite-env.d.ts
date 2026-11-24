/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YOUTUBE_BGM_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


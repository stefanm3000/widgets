/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PULSE_API_URL?: string;
  readonly VITE_PULSE_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

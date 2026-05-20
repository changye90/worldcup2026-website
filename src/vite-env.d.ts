/// <reference types="vite/client" />

/** Set in `vite.config.ts` via `define` (changes every `vite build` / dev server start). */
declare const __OKCOPA_BUILD__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Minimal types for Cloudflare Pages Functions (see docs/whatsapp-link-preview.md). */
interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SITE_ORIGIN?: string;
}

type PagesFunction<E = Env> = (
  context: EventContext<E, unknown, unknown>,
) => Response | Promise<Response>;

interface EventContext<E, P, D> {
  request: Request;
  env: E;
  params: P;
  data: D;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
}

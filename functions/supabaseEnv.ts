/** Cloudflare Functions only receive SUPABASE_* (not VITE_*). */
export function resolveSupabaseEnv(env: {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}): { url: string; key: string } | null {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

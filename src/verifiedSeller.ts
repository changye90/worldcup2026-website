import { getTicketWallSupabase } from './ticketPosts';
import { whatsappDigits } from './ticketPostForm';

export interface VerifiedSellerProfile {
  id: string;
  displayName: string;
  whatsapp: string;
  proofUrls: string[];
  status: 'pending' | 'active' | 'rejected';
  createdAt: number;
}

const SESSION_KEY = 'okcopa-verified-seller-v1';
const SELLERS_TABLE = 'okcopa_verified_sellers';
const PROOFS_BUCKET = 'ticket-proofs';
const MAX_PROOF_BYTES = 2_500_000;

export function loadVerifiedSellerSession(): VerifiedSellerProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as VerifiedSellerProfile;
    if (!p?.id || p.status !== 'active') return null;
    return p;
  } catch {
    return null;
  }
}

export function saveVerifiedSellerSession(profile: VerifiedSellerProfile): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
}

export function clearVerifiedSellerSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

function newSellerId(): string {
  return `seller-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function uploadTicketProofImage(
  file: File,
  sellerId: string,
): Promise<string | null> {
  if (file.size > MAX_PROOF_BYTES) return null;
  const supabase = getTicketWallSupabase();
  if (!supabase) return null;
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${sellerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(PROOFS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) return null;
  const { data } = supabase.storage.from(PROOFS_BUCKET).getPublicUrl(path);
  return data.publicUrl || null;
}

export async function registerVerifiedSeller(opts: {
  displayName: string;
  whatsapp: string;
  proofUrls: string[];
}): Promise<VerifiedSellerProfile | null> {
  const supabase = getTicketWallSupabase();
  if (!supabase || opts.proofUrls.length === 0) return null;
  const digits = whatsappDigits(opts.whatsapp);
  if (digits.length < 8) return null;

  const profile: VerifiedSellerProfile = {
    id: newSellerId(),
    displayName: opts.displayName.trim(),
    whatsapp: opts.whatsapp.trim(),
    proofUrls: opts.proofUrls,
    status: 'active',
    createdAt: Date.now(),
  };

  const { error } = await supabase.from(SELLERS_TABLE).upsert({
    id: profile.id,
    display_name: profile.displayName,
    whatsapp: profile.whatsapp,
    proof_urls: profile.proofUrls,
    status: profile.status,
    created_at_ms: profile.createdAt,
  });
  if (error) return null;
  saveVerifiedSellerSession(profile);
  return profile;
}

export async function fetchVerifiedSeller(id: string): Promise<VerifiedSellerProfile | null> {
  const supabase = getTicketWallSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(SELLERS_TABLE)
    .select('id, display_name, whatsapp, proof_urls, status, created_at_ms')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    displayName: data.display_name,
    whatsapp: data.whatsapp,
    proofUrls: Array.isArray(data.proof_urls) ? data.proof_urls : [],
    status: data.status,
    createdAt: data.created_at_ms ?? 0,
  };
}

export async function uploadListingProofFiles(
  files: File[],
  sellerId: string,
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files.slice(0, 4)) {
    const url = await uploadTicketProofImage(file, sellerId);
    if (url) urls.push(url);
  }
  return urls;
}

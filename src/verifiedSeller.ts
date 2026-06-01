import { getAuthSession } from './auth';
import { getSupabase } from './supabaseClient';
import { whatsappDigits } from './ticketPostForm';

export interface VerifiedSellerProfile {
  id: string;
  userId: string;
  displayName: string;
  whatsapp: string;
  proofUrls: string[];
  status: 'pending' | 'active' | 'rejected';
  createdAt: number;
}

const SESSION_KEY = 'okcopa-verified-seller-v2';
const SELLERS_TABLE = 'okcopa_verified_sellers';
const PROOFS_BUCKET = 'ticket-proofs';
const MAX_PROOF_BYTES = 2_500_000;

export function loadVerifiedSellerSession(): VerifiedSellerProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as VerifiedSellerProfile;
    if (!p?.id || !p.userId || p.status !== 'active') return null;
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
  localStorage.removeItem('okcopa-verified-seller-v1');
}

function rowToProfile(data: {
  id: string;
  user_id: string;
  display_name: string;
  whatsapp: string;
  proof_urls: unknown;
  status: VerifiedSellerProfile['status'];
  created_at_ms: number | null;
}): VerifiedSellerProfile {
  return {
    id: data.id,
    userId: data.user_id,
    displayName: data.display_name,
    whatsapp: data.whatsapp,
    proofUrls: Array.isArray(data.proof_urls) ? (data.proof_urls as string[]) : [],
    status: data.status,
    createdAt: data.created_at_ms ?? 0,
  };
}

/** Load seller profile for the signed-in user (DB + cache). */
export async function fetchVerifiedSellerForUser(userId: string): Promise<VerifiedSellerProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(SELLERS_TABLE)
    .select('id, user_id, display_name, whatsapp, proof_urls, status, created_at_ms')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data?.user_id) return null;
  const profile = rowToProfile(data as Parameters<typeof rowToProfile>[0]);
  if (profile.status === 'active') saveVerifiedSellerSession(profile);
  return profile;
}

export async function uploadTicketProofImage(
  file: File,
  folderId: string,
): Promise<string | null> {
  if (file.size > MAX_PROOF_BYTES) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${folderId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
  const supabase = getSupabase();
  const session = await getAuthSession();
  if (!supabase || !session?.user || opts.proofUrls.length === 0) return null;
  if (!session.user.email_confirmed_at) return null;

  const userId = session.user.id;
  const email = session.user.email?.trim() || '';
  const digits = whatsappDigits(opts.whatsapp);
  if (digits.length < 8) return null;

  const profile: VerifiedSellerProfile = {
    id: userId,
    userId,
    displayName: opts.displayName.trim(),
    whatsapp: opts.whatsapp.trim(),
    proofUrls: opts.proofUrls,
    status: 'active',
    createdAt: Date.now(),
  };

  const { error } = await supabase.from(SELLERS_TABLE).upsert({
    id: profile.id,
    user_id: userId,
    email,
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
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(SELLERS_TABLE)
    .select('id, user_id, display_name, whatsapp, proof_urls, status, created_at_ms')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  if (!data.user_id) {
    return {
      id: data.id,
      userId: '',
      displayName: data.display_name,
      whatsapp: data.whatsapp,
      proofUrls: Array.isArray(data.proof_urls) ? data.proof_urls : [],
      status: data.status,
      createdAt: data.created_at_ms ?? 0,
    };
  }
  return rowToProfile(data as Parameters<typeof rowToProfile>[0]);
}

export async function uploadListingProofFiles(
  files: File[],
  folderId: string,
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files.slice(0, 4)) {
    const url = await uploadTicketProofImage(file, folderId);
    if (url) urls.push(url);
  }
  return urls;
}

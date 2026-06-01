import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Upload } from 'lucide-react';
import { AnalyticsEvent, track } from './analytics';
import type { Translations } from './i18n';
import { whatsappDigits } from './ticketPostForm';
import {
  loadVerifiedSellerSession,
  registerVerifiedSeller,
  uploadListingProofFiles,
  type VerifiedSellerProfile,
} from './verifiedSeller';
import { whatsappDigitsMatch } from './platformGuarantee';

const fieldCls =
  'w-full rounded-xl border border-gray-600/80 bg-[rgb(6,12,22)] px-3.5 py-2.5 text-sm text-amber-300 placeholder:text-gray-500 focus:border-grass-500/50 focus:outline-none focus:ring-1 focus:ring-grass-500/30';

export function validatePlatformGuaranteeSubmit(opts: {
  enabled: boolean;
  session: VerifiedSellerProfile | null;
  whatsapp: string;
  listingProofs: File[];
  agreed: boolean;
  tr: Translations;
}): string | null {
  if (!opts.enabled) return null;
  if (!opts.session) return opts.tr.verifiedMustRegister;
  if (!whatsappDigitsMatch(opts.session.whatsapp, opts.whatsapp)) return opts.tr.verifiedWhatsappMustMatch;
  if (opts.listingProofs.length === 0) return opts.tr.verifiedListingProofRequired;
  if (!opts.agreed) return opts.tr.verifiedAgreeRequired;
  return null;
}

export function PlatformGuaranteeSellSection({
  tr,
  whatsapp,
  sellerName,
  enabled,
  onEnabledChange,
  session,
  onSessionChange,
  listingProofs,
  onListingProofsChange,
  agreed,
  onAgreedChange,
  onError,
}: {
  tr: Translations;
  whatsapp: string;
  sellerName: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  session: VerifiedSellerProfile | null;
  onSessionChange: (s: VerifiedSellerProfile | null) => void;
  listingProofs: File[];
  onListingProofsChange: (f: File[]) => void;
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
  onError: (msg: string | null) => void;
}) {
  const [regName, setRegName] = useState(sellerName);
  const [regProofs, setRegProofs] = useState<File[]>([]);
  const [regAgreed, setRegAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = loadVerifiedSellerSession();
    if (saved && !session) onSessionChange(saved);
  }, [onSessionChange, session]);

  useEffect(() => {
    if (sellerName.trim()) setRegName(sellerName.trim());
  }, [sellerName]);

  const register = async () => {
    onError(null);
    if (!regName.trim()) {
      onError(tr.verifiedRegisterNameRequired);
      return;
    }
    if (whatsappDigits(whatsapp).length < 8) {
      onError(tr.verifiedRegisterWhatsappRequired);
      return;
    }
    if (regProofs.length === 0) {
      onError(tr.verifiedRegisterProofRequired);
      return;
    }
    if (!regAgreed) {
      onError(tr.verifiedAgreeRequired);
      return;
    }
    setBusy(true);
    const tempId = `pending-${Date.now()}`;
    const uploaded = await uploadListingProofFiles(regProofs, tempId);
    if (uploaded.length === 0) {
      setBusy(false);
      onError(tr.verifiedUploadFailed);
      return;
    }
    const profile = await registerVerifiedSeller({
      displayName: regName.trim(),
      whatsapp: whatsapp.trim(),
      proofUrls: uploaded,
    });
    setBusy(false);
    if (!profile) {
      onError(tr.verifiedRegisterFailed);
      return;
    }
    onSessionChange(profile);
    setRegProofs([]);
    onAgreedChange(true);
    track(AnalyticsEvent.VerifiedSellerRegister, { seller_id: profile.id });
  };

  return (
    <div className="rounded-xl border border-grass-600/35 bg-grass-950/30 p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => {
            onEnabledChange(e.target.checked);
            onError(null);
            if (!e.target.checked) onAgreedChange(false);
          }}
          className="mt-1 h-4 w-4 rounded border-gray-600 text-grass-500 focus:ring-grass-500/40"
        />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-grass-200">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            {tr.verifiedEnableGuarantee}
          </span>
          <span className="mt-1 block text-[11px] leading-relaxed text-gray-500">
            {tr.verifiedEnableGuaranteeHint}
          </span>
        </span>
      </label>

      {enabled ? (
        <div className="mt-4 space-y-4 border-t border-grass-700/30 pt-4">
          {!session ? (
            <>
              <p className="text-xs font-semibold text-grass-300">{tr.verifiedRegisterTitle}</p>
              <p className="text-[11px] leading-relaxed text-gray-500">{tr.verifiedRegisterIntro}</p>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-300">
                  {tr.formLabelName}
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  className={fieldCls}
                  autoComplete="name"
                />
              </div>
              <ProofUpload
                tr={tr}
                files={regProofs}
                onChange={setRegProofs}
                label={tr.verifiedRegisterProofLabel}
                hint={tr.verifiedRegisterProofHint}
              />
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={regAgreed}
                  onChange={e => setRegAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-600 text-grass-500"
                />
                <span className="text-[11px] leading-relaxed text-gray-400">{tr.verifiedAgreeTerms}</span>
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void register()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-grass-600 py-2.5 text-sm font-bold text-white hover:bg-grass-500 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {tr.verifiedRegisterSubmit}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-grass-300">
                {tr.verifiedRegisteredAs(session.displayName)}
              </p>
              {!whatsappDigitsMatch(session.whatsapp, whatsapp) ? (
                <p className="text-xs text-amber-400">{tr.verifiedWhatsappMustMatch}</p>
              ) : null}
              <ProofUpload
                tr={tr}
                files={listingProofs}
                onChange={onListingProofsChange}
                label={tr.verifiedListingProofLabel}
                hint={tr.verifiedListingProofHint}
              />
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => onAgreedChange(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-600 text-grass-500"
                />
                <span className="text-[11px] leading-relaxed text-gray-400">{tr.verifiedAgreeTerms}</span>
              </label>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ProofUpload({
  tr,
  files,
  onChange,
  label,
  hint,
}: {
  tr: Translations;
  files: File[];
  onChange: (f: File[]) => void;
  label: string;
  hint: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-300">{label}</label>
      <p className="mb-2 text-[11px] text-gray-500">{hint}</p>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-600 bg-pitch-900/50 px-4 py-5 hover:border-grass-500/50">
        <Upload className="h-6 w-6 text-gray-500" />
        <span className="text-xs font-medium text-gray-400">{tr.verifiedUploadCta}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={e => {
            const picked = Array.from(e.target.files || []);
            onChange([...files, ...picked].slice(0, 4));
            e.target.value = '';
          }}
        />
      </label>
      {files.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                className="text-red-400 hover:text-red-300"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                {tr.verifiedRemoveFile}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

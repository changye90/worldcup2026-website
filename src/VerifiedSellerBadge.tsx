import { ShieldCheck } from 'lucide-react';
import type { Translations } from './i18n';

export function VerifiedSellerBadge({
  tr,
  size = 'sm',
}: {
  tr: Translations;
  size?: 'sm' | 'md';
}) {
  const cls =
    size === 'md'
      ? 'px-3 py-1.5 text-[11px]'
      : 'px-2.5 py-1 text-[10px]';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-grass-500/50 bg-grass-500/15 font-bold uppercase tracking-wide text-grass-200 ${cls}`}
      title={tr.verifiedSellerBadgeHint}
    >
      <ShieldCheck className={size === 'md' ? 'h-4 w-4' : 'h-3 w-3 shrink-0'} aria-hidden />
      {tr.verifiedSellerBadge}
    </span>
  );
}

export function PlatformGuaranteeBanner({ tr }: { tr: Translations }) {
  return (
    <div className="rounded-xl border border-grass-500/40 bg-gradient-to-r from-grass-900/50 to-pitch-900/80 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-bold text-grass-200">
        <ShieldCheck className="h-5 w-5 shrink-0 text-grass-400" aria-hidden />
        {tr.verifiedPlatformGuaranteeTitle}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{tr.verifiedPlatformGuaranteeBody}</p>
    </div>
  );
}

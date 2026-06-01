import { useState, useEffect, useMemo } from 'react';
import { Loader2, Tag, Search, X } from 'lucide-react';
import { matches } from './data';
import { AnalyticsEvent, track } from './analytics';
import type { Lang, Translations } from './i18n';
import type { TicketWallKind, TicketWallPost } from './ticketPosts';
import {
  PlatformGuaranteeSellSection,
  validatePlatformGuaranteeSubmit,
} from './PlatformGuaranteeSellSection';
import {
  formatMatchOption,
  isValidWhatsapp,
  createWallPostFromSell,
  createWallPostFromBuy,
} from './ticketPostForm';
import { useAuth } from './auth';
import { consumeSellGuaranteePending } from './authReturn';
import { loadVerifiedSellerSession, uploadListingProofFiles, type VerifiedSellerProfile } from './verifiedSeller';

const fieldBase =
  'w-full rounded-xl border border-gray-600/80 bg-[rgb(6,12,22)] px-3.5 py-2.5 text-sm focus:border-grass-500/50 focus:outline-none focus:ring-1 focus:ring-grass-500/30';
const sellFieldCls = `${fieldBase} text-amber-300 placeholder:text-gray-500`;
const buyFieldCls = `${fieldBase} text-sky-300 placeholder:text-gray-500`;
function digitsOnly(raw: string, maxLen: number): string {
  return raw.replace(/\D/g, '').slice(0, maxLen);
}

function parseQuantityInput(raw: string): number | null {
  const t = raw.trim();
  if (!/^\d{1,2}$/.test(t)) return null;
  const n = parseInt(t, 10);
  return n >= 1 && n <= 20 ? n : null;
}
const labelCls = 'mb-1 block text-xs font-semibold text-gray-300';
const hintCls = 'mt-1 text-[11px] leading-relaxed text-gray-500';

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className={labelCls}>
      {children}
      {required ? <span className="text-red-400/90"> *</span> : null}
    </label>
  );
}

function SubmitBtn({
  tr,
  isSell,
  flash,
  disabled,
}: {
  tr: Translations;
  isSell: boolean;
  flash: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`w-full rounded-xl py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
        isSell ? 'bg-gold-500 text-pitch-950 hover:bg-gold-400' : 'bg-sky-500 text-white hover:bg-sky-400'
      }`}
    >
      {flash ? tr.ticketPostSuccess : isSell ? tr.ticketSellSubmit : tr.ticketBuySubmit}
    </button>
  );
}

function SellForm({
  tr,
  lang,
  matchOptions,
  onSubmit,
  flash,
  openWithPlatformGuarantee,
}: {
  tr: Translations;
  lang: Lang;
  matchOptions: string[];
  onSubmit: (p: TicketWallPost) => void;
  flash: boolean;
  openWithPlatformGuarantee?: boolean;
}) {
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [customMatch, setCustomMatch] = useState('');
  const [matchFilter, setMatchFilter] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('');
  const [seatDetails, setSeatDetails] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [priceNegotiable, setPriceNegotiable] = useState(false);
  const [priceAmount, setPriceAmount] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [delivery, setDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [platformGuarantee, setPlatformGuarantee] = useState(false);
  const [verifiedSeller, setVerifiedSeller] = useState<VerifiedSellerProfile | null>(() =>
    loadVerifiedSellerSession(),
  );
  const [listingProofs, setListingProofs] = useState<File[]>([]);
  const [guaranteeAgreed, setGuaranteeAgreed] = useState(false);
  const [guaranteeError, setGuaranteeError] = useState<string | null>(null);
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (openWithPlatformGuarantee || consumeSellGuaranteePending()) {
      setPlatformGuarantee(true);
    }
  }, [openWithPlatformGuarantee]);

  const allMatches = useMemo(() => {
    if (selectedMatches.length > 0) return selectedMatches;
    return customMatch
      .split(/[,;]+/)
      .map(s => s.trim())
      .filter(Boolean);
  }, [selectedMatches, customMatch]);

  const qtyNum = parseQuantityInput(quantity);
  const priceNum = priceNegotiable ? null : Number(priceAmount.replace(/,/g, '').trim());
  const ok =
    allMatches.length > 0 &&
    qtyNum != null &&
    isValidWhatsapp(whatsapp) &&
    (priceNegotiable || (priceAmount.trim() !== '' && Number.isFinite(priceNum) && (priceNum as number) > 0));

  const filteredOptions = useMemo(
    () =>
      matchOptions.filter(
        label =>
          !matchFilter.trim() || label.toLowerCase().includes(matchFilter.trim().toLowerCase()),
      ),
    [matchOptions, matchFilter],
  );

  const toggle = (l: string) =>
    setSelectedMatches(p => (p.includes(l) ? p.filter(x => x !== l) : [...p, l]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok || submitting) return;
    const gErr = validatePlatformGuaranteeSubmit({
      enabled: platformGuarantee,
      authUser: user,
      session: verifiedSeller,
      whatsapp: whatsapp.trim(),
      listingProofs,
      agreed: guaranteeAgreed,
      tr,
    });
    if (gErr) {
      setGuaranteeError(gErr);
      return;
    }
    setGuaranteeError(null);
    setSubmitting(true);

    let listingProofUrls: string[] | undefined;
    if (platformGuarantee && verifiedSeller) {
      listingProofUrls = await uploadListingProofFiles(listingProofs, verifiedSeller.id);
      if (listingProofUrls.length === 0) {
        setGuaranteeError(tr.verifiedUploadFailed);
        setSubmitting(false);
        return;
      }
      track(AnalyticsEvent.VerifiedSellerPost, {
        seller_id: verifiedSeller.id,
        proof_count: listingProofUrls.length,
      });
    }

    onSubmit(
      createWallPostFromSell(
        {
          matches: allMatches,
          quantity: qtyNum!,
          category: category.trim() || undefined,
          seatDetails: seatDetails.trim() || undefined,
          name: sellerName.trim() || verifiedSeller?.displayName || undefined,
          priceType: priceNegotiable ? 'negotiable' : 'fixed',
          priceAmount: priceNegotiable ? undefined : priceNum!,
          whatsapp: whatsapp.trim(),
          delivery: delivery.trim() || undefined,
          notes: notes.trim() || undefined,
          platformGuarantee: platformGuarantee && Boolean(verifiedSeller),
          verifiedSellerId: platformGuarantee ? verifiedSeller?.id : undefined,
          listingProofUrls,
        },
        lang,
        tr,
      ),
    );
    setSubmitting(false);
    setListingProofs([]);
  };

  return (
    <form onSubmit={handleSubmit} className="ticket-post-form ticket-post-form--sell space-y-4">
      <div>
        <FieldLabel required>{tr.formLabelMatch}</FieldLabel>
        <p className={hintCls}>{tr.formHintSellMatch}</p>
        <input
          type="search"
          value={matchFilter}
          onChange={e => setMatchFilter(e.target.value)}
          placeholder={tr.formMatchFilterPlaceholder}
          className={`${sellFieldCls} mt-2`}
          autoComplete="off"
        />
        <div className="mt-2 max-h-[min(45vh,280px)] space-y-1.5 overflow-y-auto rounded-xl border border-gray-700/60 bg-[rgb(6,12,22)]/90 p-2">
          {filteredOptions.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-gray-500">{tr.formMatchFilterNoResults}</p>
          ) : (
            filteredOptions.map(label => (
              <button
                key={label}
                type="button"
                onClick={() => toggle(label)}
                className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs ${
                  selectedMatches.includes(label)
                    ? 'border border-gold-500/50 bg-gold-500/15 text-gold-100'
                    : 'text-gray-400 hover:bg-pitch-800'
                }`}
              >
                {label}
              </button>
            ))
          )}
        </div>
        {selectedMatches.length === 0 ? (
          <input
            type="text"
            value={customMatch}
            onChange={e => setCustomMatch(e.target.value)}
            placeholder={tr.formPlaceholderCustomMatch}
            className={`${sellFieldCls} mt-2`}
          />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel required>{tr.formLabelQuantity}</FieldLabel>
          <input
            type="text"
            inputMode="numeric"
            value={quantity}
            onChange={e => setQuantity(digitsOnly(e.target.value, 2))}
            placeholder={tr.formPlaceholderQuantity}
            className={sellFieldCls}
            autoComplete="off"
          />
        </div>
        <div>
          <FieldLabel>{tr.formLabelCategory}</FieldLabel>
          <input
            type="text"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder={tr.formPlaceholderCategory}
            className={sellFieldCls}
          />
        </div>
      </div>

      <div>
        <FieldLabel>{tr.formLabelSeatDetails}</FieldLabel>
        <input
          type="text"
          value={seatDetails}
          onChange={e => setSeatDetails(e.target.value)}
          placeholder={tr.formPlaceholderSeatDetails}
          className={sellFieldCls}
          autoComplete="off"
        />
      </div>

      <div>
        <FieldLabel>{tr.formLabelName}</FieldLabel>
        <input
          type="text"
          value={sellerName}
          onChange={e => setSellerName(e.target.value)}
          placeholder={tr.formPlaceholderName}
          className={sellFieldCls}
          autoComplete="name"
        />
      </div>

      <div>
        <FieldLabel required>{tr.formLabelPrice}</FieldLabel>
        <div className="mt-1 flex flex-wrap items-stretch gap-2">
          <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-gray-600/80 bg-pitch-950/40 px-3 py-2.5 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={priceNegotiable}
              onChange={e => setPriceNegotiable(e.target.checked)}
              className="rounded border-gray-600"
            />
            {tr.formPriceNegotiable}
          </label>
          <div className="flex min-w-[8rem] flex-1 items-center gap-2">
            <span className="shrink-0 text-sm text-gray-500">USD $</span>
            <input
              type="text"
              inputMode="decimal"
              value={priceAmount}
              onChange={e => setPriceAmount(e.target.value.replace(/[^\d.,]/g, ''))}
              placeholder={tr.formPlaceholderPrice}
              className={`${sellFieldCls} min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-45`}
              autoComplete="off"
              disabled={priceNegotiable}
            />
          </div>
        </div>
      </div>

      <div>
        <FieldLabel required>{tr.formLabelWhatsapp}</FieldLabel>
        <input
          type="tel"
          value={whatsapp}
          onChange={e => setWhatsapp(e.target.value)}
          placeholder={tr.formPlaceholderWhatsapp}
          className={sellFieldCls}
        />
      </div>

      <div>
        <FieldLabel>{tr.formLabelDelivery}</FieldLabel>
        <input
          type="text"
          value={delivery}
          onChange={e => setDelivery(e.target.value)}
          placeholder={tr.formPlaceholderDelivery}
          className={sellFieldCls}
        />
      </div>

      <div>
        <FieldLabel>{tr.formLabelNotes}</FieldLabel>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder={tr.formPlaceholderNotes}
          className={`${sellFieldCls} min-h-[72px]`}
        />
      </div>

      <PlatformGuaranteeSellSection
        tr={tr}
        whatsapp={whatsapp}
        sellerName={sellerName}
        enabled={platformGuarantee}
        onEnabledChange={setPlatformGuarantee}
        session={verifiedSeller}
        onSessionChange={setVerifiedSeller}
        listingProofs={listingProofs}
        onListingProofsChange={setListingProofs}
        agreed={guaranteeAgreed}
        onAgreedChange={setGuaranteeAgreed}
        onError={setGuaranteeError}
      />
      {guaranteeError ? <p className="text-xs text-red-400">{guaranteeError}</p> : null}

      <button
        type="submit"
        disabled={!ok || submitting}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-45 bg-gold-500 text-pitch-950 hover:bg-gold-400`}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {flash ? tr.ticketPostSuccess : tr.ticketSellSubmit}
      </button>
    </form>
  );
}

function BuyForm({
  tr,
  lang,
  onSubmit,
  flash,
}: {
  tr: Translations;
  lang: Lang;
  onSubmit: (p: TicketWallPost) => void;
  flash: boolean;
}) {
  const [targetMatch, setTargetMatch] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('');
  const [seatDetails, setSeatDetails] = useState('');
  const [budget, setBudget] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const qtyNum = parseQuantityInput(quantity);
  const ok = targetMatch.trim() && qtyNum != null && isValidWhatsapp(whatsapp);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    onSubmit(
      createWallPostFromBuy(
        {
          targetMatch: targetMatch.trim(),
          quantity: qtyNum!,
          category: category.trim() || undefined,
          seatDetails: seatDetails.trim() || undefined,
          budget: budget.trim() || undefined,
          whatsapp: whatsapp.trim(),
        },
        lang,
        tr,
      ),
    );
  };

  return (
    <form onSubmit={handleSubmit} className="ticket-post-form ticket-post-form--buy space-y-4">
      <div>
        <FieldLabel required>{tr.formLabelTargetMatch}</FieldLabel>
        <p className={hintCls}>{tr.formHintBuyMatch}</p>
        <input
          type="text"
          value={targetMatch}
          onChange={e => setTargetMatch(e.target.value)}
          placeholder={tr.formPlaceholderTargetMatch}
          className={`${buyFieldCls} mt-2`}
          autoComplete="off"
        />
      </div>
      <div>
        <FieldLabel required>{tr.formLabelQuantity}</FieldLabel>
        <p className={hintCls}>{tr.formHintBuyQuantity}</p>
        <input
          type="text"
          inputMode="numeric"
          value={quantity}
          onChange={e => setQuantity(digitsOnly(e.target.value, 2))}
          placeholder={tr.formPlaceholderQuantity}
          className={`${buyFieldCls} mt-1`}
          autoComplete="off"
        />
      </div>
      <div>
        <FieldLabel>{tr.formLabelCategory}</FieldLabel>
        <p className={hintCls}>{tr.formHintBuyCategory}</p>
        <input
          type="text"
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder={tr.formPlaceholderCategory}
          className={`${buyFieldCls} mt-1`}
          autoComplete="off"
        />
      </div>
      <div>
        <FieldLabel>{tr.formLabelSeatDetails}</FieldLabel>
        <p className={hintCls}>{tr.formHintBuySeatDetails}</p>
        <input
          type="text"
          value={seatDetails}
          onChange={e => setSeatDetails(e.target.value)}
          placeholder={tr.formPlaceholderSeatDetails}
          className={`${buyFieldCls} mt-1`}
          autoComplete="off"
        />
      </div>
      <div>
        <FieldLabel>{tr.formLabelBudget}</FieldLabel>
        <p className={hintCls}>{tr.formHintBuyBudget}</p>
        <input
          type="text"
          value={budget}
          onChange={e => setBudget(e.target.value)}
          placeholder={tr.formPlaceholderBudget}
          className={`${buyFieldCls} mt-1`}
        />
      </div>
      <div>
        <FieldLabel required>{tr.formLabelWhatsapp}</FieldLabel>
        <input
          type="tel"
          value={whatsapp}
          onChange={e => setWhatsapp(e.target.value)}
          placeholder={tr.formPlaceholderWhatsapp}
          className={buyFieldCls}
        />
      </div>
      <SubmitBtn tr={tr} isSell={false} flash={flash} disabled={!ok} />
    </form>
  );
}

export function TicketPostFormModal({
  kind,
  lang,
  tr,
  onClose,
  onSubmit,
  openWithPlatformGuarantee,
}: {
  kind: TicketWallKind;
  lang: Lang;
  tr: Translations;
  onClose: () => void;
  onSubmit: (post: TicketWallPost) => void;
  openWithPlatformGuarantee?: boolean;
}) {
  const [flash, setFlash] = useState(false);
  const isSell = kind === 'sell';
  const matchOptions = useMemo(
    () => [...matches].sort((a, b) => a.matchNumber - b.matchNumber).map(formatMatchOption),
    [],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const submit = (post: TicketWallPost) => {
    onSubmit(post);
    setFlash(true);
    setTimeout(onClose, 900);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-pitch-950/80 backdrop-blur-sm"
        aria-label={tr.ticketModalClose}
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl ${
          isSell
            ? 'border-gold-500/30 bg-gradient-to-br from-pitch-800 to-pitch-900'
            : 'border-sky-500/30 bg-gradient-to-br from-pitch-800 to-pitch-900'
        }`}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-gray-700/50 p-5 pb-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
              isSell ? 'border-gold-500/35 bg-gold-500/10' : 'border-sky-500/35 bg-sky-500/10'
            }`}
          >
            {isSell ? <Tag className="h-5 w-5 text-gold-300" /> : <Search className="h-5 w-5 text-sky-300" />}
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <h2 className="text-lg font-bold text-white">{isSell ? tr.ticketSellTitle : tr.ticketBuyTitle}</h2>
            <p className="mt-1 text-xs text-gray-400">{isSell ? tr.ticketSellDesc : tr.ticketBuyDesc}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 hover:bg-pitch-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4">
          {isSell ? (
            <SellForm
              tr={tr}
              lang={lang}
              matchOptions={matchOptions}
              onSubmit={submit}
              flash={flash}
              openWithPlatformGuarantee={openWithPlatformGuarantee}
            />
          ) : (
            <BuyForm tr={tr} lang={lang} onSubmit={submit} flash={flash} />
          )}
        </div>
      </div>
    </div>
  );
}

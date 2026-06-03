import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, MessageCircle, Tag } from 'lucide-react';
import { AnalyticsEvent, track } from './analytics';
import type { Lang, Translations } from './i18n';
import type { TicketBuyPayload, TicketSellPayload } from './ticketPostForm';
import { formatBudgetDisplay, formatCategorySeatLine, getWhatsappHref } from './ticketPostForm';
import {
  formatMatchKickoffDisplay,
  primaryScheduleMatchForSellPost,
  resolvedSellMatches,
  sellFixedPriceDisplay,
  sellHasFixedPrice,
  sellNotesExcludingStructured,
  whatsappPrefillContext,
} from './sellPostResolve';
import { applyTicketPostPageSeo } from './seoDocument';
import {
  ticketDetailMatchLabel,
  ticketDetailSeoParagraphs,
  ticketDetailSubhead,
} from './ticketDetailSeo';
import { postHasPlatformGuarantee } from './platformGuarantee';
import { PlatformGuaranteeBanner, VerifiedSellerBadge } from './VerifiedSellerBadge';
import {
  readTicketDetailEntrySource,
  resetPageScrollTop,
  stripTicketShareRefParam,
} from './ticketDetailEntry';
import { TicketDetailSharePanel } from './TicketDetailSharePanel';
import { fetchTicketPostById, type TicketWallPost } from './ticketPosts';

function timeAgo(ts: number, tr: Translations): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return tr.ticketWallJustNow;
  if (mins < 60) return tr.ticketWallMinutesAgo(mins);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return tr.ticketWallHoursAgo(hrs);
  return tr.ticketWallDaysAgo(Math.floor(hrs / 24));
}

function publisherName(post: TicketWallPost): string {
  const p = post.payload;
  if (p && 'name' in p && typeof p.name === 'string' && p.name.trim()) return p.name.trim();
  return post.username?.trim() || 'Fan';
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-700/40 py-3 last:border-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-100">{children}</dd>
    </div>
  );
}

function SellDetailBody({ post, tr, lang }: { post: TicketWallPost; tr: Translations; lang: Lang }) {
  const p = post.payload as TicketSellPayload | undefined;
  const schedule = primaryScheduleMatchForSellPost(post);
  const allRes = resolvedSellMatches(post);
  const sellerNotes = sellNotesExcludingStructured(post, schedule);
  const seatsLine = p ? formatCategorySeatLine(p) : null;

  return (
    <dl className="rounded-xl border border-gray-700/50 bg-pitch-900/50 px-4">
      <DetailRow label={tr.ticketDetailPublisher}>
        <span className="inline-flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            {post.flag}
          </span>
          <span className="font-semibold text-white">{publisherName(post)}</span>
        </span>
      </DetailRow>
      <DetailRow label={tr.ticketCardLabelMatch}>
        {schedule ? (
          <span>
            {schedule.flag1} {schedule.homeTeam} {tr.ticketSellVs} {schedule.awayTeam} {schedule.flag2}
            {allRes.length > 1 ? (
              <span className="mt-1 block text-xs text-gray-500">
                {tr.ticketSellExtraMatches(allRes.length - 1)}
              </span>
            ) : null}
          </span>
        ) : (
          post.summary
        )}
      </DetailRow>
      {schedule ? (
        <>
          <DetailRow label={tr.ticketCardLabelStadium}>
            {[schedule.stadium, schedule.city].filter(Boolean).join(', ')}
          </DetailRow>
          <DetailRow label={tr.ticketCardLabelKickoff}>{formatMatchKickoffDisplay(schedule, lang)}</DetailRow>
        </>
      ) : null}
      {p ? (
        <>
          <DetailRow label={tr.formLabelQuantity}>{p.quantity}</DetailRow>
          {p.category ? <DetailRow label={tr.formLabelCategory}>{p.category}</DetailRow> : null}
          {seatsLine ? <DetailRow label={tr.ticketCardLabelSeats}>{seatsLine}</DetailRow> : null}
          <DetailRow label={tr.formLabelPrice}>
            {sellHasFixedPrice(post) ? sellFixedPriceDisplay(post) : tr.ticketPriceNegotiableTitle}
          </DetailRow>
          {p.delivery?.trim() ? <DetailRow label={tr.formLabelDelivery}>{p.delivery.trim()}</DetailRow> : null}
        </>
      ) : null}
      {sellerNotes ? (
        <DetailRow label={tr.ticketSellerNotesHeading}>
          <p className="whitespace-pre-wrap text-gray-300">{sellerNotes}</p>
        </DetailRow>
      ) : null}
    </dl>
  );
}

function BuyDetailBody({ post, tr }: { post: TicketWallPost; tr: Translations }) {
  const p = post.payload as TicketBuyPayload | undefined;

  return (
    <dl className="rounded-xl border border-gray-700/50 bg-pitch-900/50 px-4">
      <DetailRow label={tr.ticketDetailPublisher}>
        <span className="inline-flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            {post.flag}
          </span>
          <span className="font-semibold text-white">{publisherName(post)}</span>
        </span>
      </DetailRow>
      <DetailRow label={tr.formLabelTargetMatch}>{p?.targetMatch?.trim() || post.summary}</DetailRow>
      {p ? (
        <>
          <DetailRow label={tr.formLabelQuantity}>{p.quantity}</DetailRow>
          {p.category ? <DetailRow label={tr.formLabelCategory}>{p.category}</DetailRow> : null}
          {p.seatDetails?.trim() ? (
            <DetailRow label={tr.formLabelSeatDetails}>{p.seatDetails.trim()}</DetailRow>
          ) : null}
          {p.budget?.trim() ? (
            <DetailRow label={tr.formLabelBudget}>{formatBudgetDisplay(p.budget, tr)}</DetailRow>
          ) : null}
        </>
      ) : null}
    </dl>
  );
}

function TicketDetailSeoBlock({
  post,
  tr,
  lang,
  onBrowseWall,
  onOpenGuides,
}: {
  post: TicketWallPost;
  tr: Translations;
  lang: Lang;
  onBrowseWall: () => void;
  onOpenGuides: () => void;
}) {
  const paragraphs = ticketDetailSeoParagraphs(post, tr, lang);

  return (
    <section
      className="mt-8 border-t border-gray-700/40 pt-6"
      aria-labelledby="ticket-detail-seo-title"
    >
      <h2 id="ticket-detail-seo-title" className="text-sm font-bold text-gray-300">
        {tr.ticketDetailSeoSectionTitle}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-500">
        {paragraphs.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold" aria-label="Related">
        <button
          type="button"
          onClick={onBrowseWall}
          className="text-grass-400 hover:text-grass-300"
        >
          {tr.ticketDetailSeoLinkWall} →
        </button>
        <button
          type="button"
          onClick={onOpenGuides}
          className="text-gold-400/90 hover:text-gold-300"
        >
          {tr.ticketDetailSeoLinkGuides} →
        </button>
      </nav>
    </section>
  );
}

export function TicketPostDetailPage({
  postId,
  wallPosts,
  tr,
  lang,
  onBack,
  onCreatePost,
  onOpenGuides,
}: {
  postId: string;
  wallPosts: TicketWallPost[];
  tr: Translations;
  lang: Lang;
  onBack: () => void;
  onCreatePost?: () => void;
  onOpenGuides?: () => void;
}) {
  const [post, setPost] = useState<TicketWallPost | null>(() =>
    wallPosts.find(p => p.id === postId) ?? null,
  );
  const [loading, setLoading] = useState(!post);
  const [entrySource] = useState(() => readTicketDetailEntrySource());

  useEffect(() => {
    resetPageScrollTop();
  }, [postId]);

  useEffect(() => {
    const cached = wallPosts.find(p => p.id === postId);
    if (cached) {
      setPost(cached);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void fetchTicketPostById(postId).then(fetched => {
      if (!active) return;
      setPost(fetched);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [postId, wallPosts]);

  useEffect(() => {
    if (!post) return;
    stripTicketShareRefParam();
    track(AnalyticsEvent.TicketDetailView, {
      post_id: post.id,
      kind: post.kind,
      entry_source: entrySource,
      verified: postHasPlatformGuarantee(post),
    });
    applyTicketPostPageSeo(lang, post, tr);
  }, [post?.id, lang, tr, entrySource]);

  const isSell = post?.kind === 'sell';
  const verified = post ? postHasPlatformGuarantee(post) : false;
  const schedule = post && isSell ? primaryScheduleMatchForSellPost(post) : null;
  const heading = post ? ticketDetailMatchLabel(post, tr) : '';
  const subhead = post ? ticketDetailSubhead(post, lang, tr) : null;
  const sellPayload = isSell ? (post?.payload as TicketSellPayload | undefined) : undefined;
  const buyPayload = !isSell ? (post?.payload as TicketBuyPayload | undefined) : undefined;
  const sellSeatsLine = sellPayload ? formatCategorySeatLine(sellPayload) : null;
  const waHref = post
    ? getWhatsappHref(post, tr.ticketWhatsappPrefill(whatsappPrefillContext(post)))
    : null;
  const onWhatsappClick = () => {
    if (!post) return;
    track(AnalyticsEvent.TicketDetailWhatsapp, {
      post_id: post.id,
      kind: post.kind,
      has_wa: true,
      verified,
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <nav className="mb-4 text-xs text-gray-500" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <button type="button" onClick={onBack} className="hover:text-white">
              OKcopa
            </button>
          </li>
          <li aria-hidden>/</li>
          <li>
            <button type="button" onClick={onBack} className="hover:text-white">
              {tr.tabTickets}
            </button>
          </li>
          {post ? (
            <>
              <li aria-hidden>/</li>
              <li className="text-gray-400" aria-current="page">
                {isSell ? tr.ticketSellStatusBadge : tr.tabTicketBuy}
              </li>
            </>
          ) : null}
        </ol>
      </nav>

      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {tr.ticketDetailBack}
      </button>

      {loading ? (
        <div className="animate-pulse space-y-4 rounded-2xl border border-gray-700/50 bg-pitch-800/60 p-6">
          <div className="h-6 w-2/3 rounded bg-pitch-700" />
          <div className="h-32 rounded bg-pitch-700/70" />
        </div>
      ) : !post ? (
        <div className="rounded-2xl border border-dashed border-gray-700/60 bg-pitch-800/40 px-6 py-14 text-center">
          <p className="text-sm text-gray-400">{tr.ticketDetailNotFound}</p>
        </div>
      ) : (
        <>
          <article className="overflow-hidden rounded-2xl border border-gray-700/50 bg-pitch-800/90 shadow-xl shadow-black/25">
            <header className="border-b border-gray-700/40 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      isSell
                        ? 'border-gold-500/40 bg-gold-500/10 text-gold-200'
                        : 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                    }`}
                  >
                    <Tag className="h-3 w-3 shrink-0" />
                  {isSell ? tr.ticketSellStatusBadge : tr.tabTicketBuy}
                </span>
                {verified ? (
                  <span className="mt-2 block">
                    <VerifiedSellerBadge tr={tr} size="md" />
                  </span>
                ) : null}

                  <h1 className="mt-3 text-xl font-bold leading-snug text-white sm:text-2xl">
                    {schedule ? (
                      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span aria-hidden>{schedule.flag1}</span>
                        <span>{schedule.homeTeam}</span>
                        <span className="font-normal text-gray-500">{tr.ticketSellVs}</span>
                        <span>{schedule.awayTeam}</span>
                        <span aria-hidden>{schedule.flag2}</span>
                      </span>
                    ) : (
                      heading
                    )}
                  </h1>

                  {subhead ? (
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
                      {schedule?.stadium || schedule?.city ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-400/80" />
                          {[schedule.stadium, schedule.city].filter(Boolean).join(', ')}
                        </span>
                      ) : null}
                      {schedule ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-gold-400/80" />
                          {formatMatchKickoffDisplay(schedule, lang)}
                        </span>
                      ) : (
                        <span>{subhead}</span>
                      )}
                    </p>
                  ) : null}

                  <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3 shrink-0" />
                    {timeAgo(post.createdAt, tr)}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-3">
                    {isSell ? (
                      <div className="rounded-lg border border-gold-500/30 bg-gold-500/10 p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-gold-200/90">{tr.formLabelPrice}</p>
                        <p className="mt-1 text-base font-extrabold text-gold-200 sm:text-lg">
                          {sellHasFixedPrice(post) ? sellFixedPriceDisplay(post) : tr.ticketPriceNegotiableTitle}
                        </p>
                      </div>
                    ) : buyPayload?.budget?.trim() ? (
                      <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-sky-200/90">{tr.formLabelBudget}</p>
                        <p className="mt-1 text-base font-extrabold text-sky-200 sm:text-lg">
                          {formatBudgetDisplay(buyPayload.budget, tr)}
                        </p>
                      </div>
                    ) : null}
                    {sellPayload?.quantity ? (
                      <div className="rounded-lg border border-gray-700/70 bg-pitch-900/70 p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500">{tr.formLabelQuantity}</p>
                        <p className="mt-1 text-base font-bold text-white sm:text-lg">{sellPayload.quantity}</p>
                      </div>
                    ) : buyPayload?.quantity ? (
                      <div className="rounded-lg border border-gray-700/70 bg-pitch-900/70 p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500">{tr.formLabelQuantity}</p>
                        <p className="mt-1 text-base font-bold text-white sm:text-lg">{buyPayload.quantity}</p>
                      </div>
                    ) : null}
                    {sellSeatsLine ? (
                      <div className="rounded-lg border border-gray-700/70 bg-pitch-900/70 p-2.5 sm:col-span-1">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500">{tr.ticketCardLabelSeats}</p>
                        <p className="mt-1 text-sm font-semibold text-white sm:text-base">{sellSeatsLine}</p>
                      </div>
                    ) : schedule ? (
                      <div className="rounded-lg border border-gray-700/70 bg-pitch-900/70 p-2.5 sm:col-span-1">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500">{tr.ticketCardLabelKickoff}</p>
                        <p className="mt-1 text-sm font-semibold text-white sm:text-base">
                          {formatMatchKickoffDisplay(schedule, lang)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {isSell ? (
                  <div className="shrink-0 sm:text-right">
                    {sellHasFixedPrice(post) ? (
                      <p className="text-2xl font-extrabold tabular-nums text-gold-300 sm:text-3xl">
                        {sellFixedPriceDisplay(post)}
                      </p>
                    ) : (
                      <div>
                        <p className="text-lg font-extrabold text-orange-300">{tr.ticketPriceNegotiableTitle}</p>
                        <p className="text-[11px] text-gray-500">{tr.ticketPriceNegotiableHint}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {waHref ? (
                <div className="mt-5 rounded-xl border border-[#25D366]/35 bg-gradient-to-br from-[#25D366]/12 via-pitch-950/90 to-pitch-900/90 px-4 py-4 sm:px-5">
                  <p className="text-base font-bold leading-snug text-white">
                    {isSell ? tr.ticketDetailWhatsappLeadSell : tr.ticketDetailWhatsappLeadBuy}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
                    {isSell ? tr.ticketDetailWhatsappHintSell : tr.ticketDetailWhatsappHintBuy}
                  </p>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onWhatsappClick}
                    className="animate-wa-pulse mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg shadow-[#25D366]/20 transition hover:brightness-110 active:scale-[0.99]"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    <MessageCircle className="h-5 w-5 shrink-0" />
                    {tr.ticketDetailWhatsappCta}
                  </a>
                </div>
              ) : null}
            </header>

            <div className="space-y-5 px-5 py-5 sm:px-6">
              {verified ? <PlatformGuaranteeBanner tr={tr} /> : null}
              {isSell ? <SellDetailBody post={post} tr={tr} lang={lang} /> : <BuyDetailBody post={post} tr={tr} />}

              <div className="flex flex-col gap-2.5">
                {!verified ? (
                  <p className="px-1 text-center text-xs leading-relaxed text-gray-500">
                    <span aria-hidden className="mr-0.5">
                      🔒
                    </span>
                    {tr.ticketTrustGuarantee}
                  </p>
                ) : null}
                <TicketDetailSharePanel post={post} tr={tr} />
              </div>
            </div>
          </article>

          <TicketDetailSeoBlock
            post={post}
            tr={tr}
            lang={lang}
            onBrowseWall={onBack}
            onOpenGuides={() => (onOpenGuides ? onOpenGuides() : onBack())}
          />
          {onCreatePost ? (
            <section className="mt-4 rounded-xl border border-gray-700/50 bg-pitch-800/70 p-4 sm:p-5">
              <p className="text-sm text-gray-300">{tr.ticketDetailPostPrompt}</p>
              <button
                type="button"
                onClick={onCreatePost}
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-pitch-900 transition hover:bg-gray-100 active:scale-[0.99]"
              >
                {tr.ticketDetailPostCta}
              </button>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

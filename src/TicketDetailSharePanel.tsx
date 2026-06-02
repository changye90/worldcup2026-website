import { useState } from 'react';
import { Check, ChevronDown, Copy, MessageCircle, Share2 } from 'lucide-react';
import { AnalyticsEvent, track } from './analytics';
import type { Translations } from './i18n';
import type { TicketWallPost } from './ticketPosts';
import {
  buildFacebookShareUrl,
  buildTicketShareUrl,
  buildWhatsAppShareUrl,
  buildXShareUrl,
  shareTicketPost,
} from './ticketShare';

export function TicketDetailSharePanel({ post, tr }: { post: TicketWallPost; tr: Translations }) {
  const [open, setOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const shareUrl = buildTicketShareUrl(post);

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    track(AnalyticsEvent.TicketDetailShareCopy, {
      post_id: post.id,
      kind: post.kind,
    });
    window.setTimeout(() => setLinkCopied(false), 1600);
  };

  const onShare = async () => {
    track(AnalyticsEvent.TicketDetailShareClick, {
      post_id: post.id,
      kind: post.kind,
      action: 'native_share',
    });
    const result = await shareTicketPost(post, tr);
    if (result === 'copied') {
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1600);
    }
  };

  const openExternal = (channel: 'whatsapp' | 'facebook' | 'x', href: string) => {
    track(AnalyticsEvent.TicketDetailShareClick, {
      post_id: post.id,
      kind: post.kind,
      action: 'external',
      channel,
    });
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="rounded-xl border border-gray-700/50 bg-pitch-950/40" aria-label={tr.ticketDetailShareTitle}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            track(AnalyticsEvent.TicketDetailShareOpen, {
              post_id: post.id,
              kind: post.kind,
            });
          }
        }}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm font-semibold text-gray-300 transition hover:text-white"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <Share2 className="h-4 w-4 text-gray-500" />
          {tr.ticketShare}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="space-y-2.5 border-t border-gray-700/40 px-3.5 pb-3.5 pt-2.5">
          <p className="break-all font-mono text-[10px] leading-relaxed text-gray-600">{shareUrl}</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-700 px-2.5 py-1.5 text-[11px] font-semibold text-gray-300 hover:border-grass-500 hover:text-grass-300"
            >
              {linkCopied ? <Check className="h-3 w-3 text-grass-400" /> : <Copy className="h-3 w-3" />}
              {linkCopied ? tr.ticketShareCopied : tr.ticketPostShareLink}
            </button>
            <button
              type="button"
              onClick={() => void onShare()}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-700 px-2.5 py-1.5 text-[11px] font-semibold text-gray-300 hover:border-grass-500"
            >
              {shareCopied ? <Check className="h-3 w-3 text-grass-400" /> : <Share2 className="h-3 w-3" />}
              {shareCopied ? tr.ticketShareCopied : tr.ticketShare}
            </button>
            <button
              type="button"
              onClick={() => openExternal('whatsapp', buildWhatsAppShareUrl(post, tr))}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white"
              style={{ backgroundColor: '#25D366' }}
            >
              <MessageCircle className="h-3 w-3" />
              WA
            </button>
            <button
              type="button"
              onClick={() => openExternal('x', buildXShareUrl(post, tr))}
              className="rounded-lg border border-gray-700 px-2.5 py-1.5 text-[11px] font-semibold text-gray-300 hover:border-sky-500"
            >
              X
            </button>
            <button
              type="button"
              onClick={() => openExternal('facebook', buildFacebookShareUrl(post, tr))}
              className="rounded-lg border border-gray-700 px-2.5 py-1.5 text-[11px] font-semibold text-gray-300 hover:border-blue-500/50"
            >
              FB
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

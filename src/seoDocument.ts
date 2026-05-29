import type { Lang, Translations } from './i18n';
import { buildAppUrl, isGuidesPath, pageMetaForUrl, pathFromTab, type ListingTab } from './seoRouting';
import { buildTicketPostPageUrl } from './ticketRouting';
import { ticketDetailJsonLd, ticketPageSeoMeta } from './ticketDetailSeo';
import type { TicketWallPost } from './ticketPosts';

const JSON_LD_ID = 'okcopa-ticket-jsonld';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const sel = `meta[${attr}="${key}"]`;
  let el = document.querySelector(sel) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(data: Record<string, unknown>) {
  let el = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = JSON_LD_ID;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function clearTicketPostStructuredData(): void {
  document.getElementById(JSON_LD_ID)?.remove();
}

export function applyPageSeo(lang: Lang, opts: { tab: ListingTab; city: string | null }): void {
  clearTicketPostStructuredData();
  const url = new URL(window.location.href);
  if (isGuidesPath(url.pathname)) {
    url.pathname = '/guides';
  } else {
    url.pathname = pathFromTab(opts.tab);
  }
  if (opts.city) url.searchParams.set('city', opts.city);
  else url.searchParams.delete('city');

  const meta = pageMetaForUrl(lang, url);
  const canonical = buildAppUrl({
    tab: opts.tab,
    city: opts.city,
    guides: isGuidesPath(window.location.pathname),
    origin: url.origin,
  }).split('#')[0];

  document.title = meta.title;
  document.documentElement.lang = lang === 'es' ? 'es' : lang === 'pt' ? 'pt' : 'en';

  upsertMeta('name', 'description', meta.description);
  upsertMeta('property', 'og:title', meta.title);
  upsertMeta('property', 'og:description', meta.description);
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('name', 'twitter:title', meta.title);
  upsertMeta('name', 'twitter:description', meta.description);
  upsertCanonical(canonical);
}

export function applyTicketPostPageSeo(lang: Lang, post: TicketWallPost, tr: Translations): void {
  const { title, description } = ticketPageSeoMeta(post, tr);
  const canonical = buildTicketPostPageUrl(post.id);
  const imageUrl = `${new URL(canonical).origin}/og/ticket.jpg?id=${encodeURIComponent(post.id)}`;

  document.title = title;
  document.documentElement.lang = lang === 'es' ? 'es' : lang === 'pt' ? 'pt' : 'en';
  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('property', 'og:type', 'article');
  upsertMeta('property', 'og:image', imageUrl);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', imageUrl);
  upsertCanonical(canonical);
  upsertJsonLd(ticketDetailJsonLd(post, tr));
}

import type { Lang } from './i18n';
import { buildAppUrl, isGuidesPath, pageMetaForUrl, pathFromTab, type ListingTab } from './seoRouting';

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

export function applyPageSeo(lang: Lang, opts: { tab: ListingTab; city: string | null }): void {
  const url = new URL(window.location.href);
  if (isGuidesPath(url.pathname)) {
    url.pathname = '/guides';
  } else {
    url.pathname = pathFromTab(opts.tab);
  }
  if (opts.city) url.searchParams.set('city', opts.city);
  else url.searchParams.delete('city');
  const ticket = url.searchParams.get('ticket');
  if (ticket) url.searchParams.set('ticket', ticket);

  const meta = pageMetaForUrl(lang, url);
  const canonical = buildAppUrl({
    tab: opts.tab,
    city: opts.city,
    guides: isGuidesPath(window.location.pathname),
    ticketId: ticket,
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

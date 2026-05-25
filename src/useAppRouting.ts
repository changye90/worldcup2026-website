import { useCallback, useEffect, useRef } from 'react';
import type { Lang } from './i18n';
import { applyPageSeo } from './seoDocument';
import { buildAppUrl, readUrlAppState, type ListingTab } from './seoRouting';

const LEGACY_TABS = new Set(['tickets', 'cars', 'hotels', 'odds']);

export function useAppRouting(
  lang: Lang,
  activeTab: ListingTab,
  activeCity: string | null,
  activeMatchNumber: number | null,
  setActiveTab: (tab: ListingTab) => void,
  setActiveCity: (city: string | null) => void,
  setActiveMatchNumber: (match: number | null) => void,
) {
  const skipUrlSync = useRef(false);
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const url = new URL(window.location.href);
    const path = url.pathname.replace(/\/$/, '') || '/';
    const legacyTab = url.searchParams.get('tab');
    if ((path === '/' || path === '') && legacyTab && LEGACY_TABS.has(legacyTab)) {
      const next = buildAppUrl({
        tab: legacyTab as ListingTab,
        city: url.searchParams.get('city'),
        match: url.searchParams.get('match')
          ? Number.parseInt(url.searchParams.get('match')!, 10)
          : null,
        ticketId: url.searchParams.get('ticket'),
      });
      window.history.replaceState(window.history.state, '', new URL(next).pathname + new URL(next).search);
    }

    const state = readUrlAppState();
    applyPageSeo(lang, { tab: state.tab, city: state.city });
    if (state.scrollToGuides) {
      window.setTimeout(() => {
        document.getElementById('ticket-guides')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, [lang]);

  useEffect(() => {
    applyPageSeo(lang, { tab: activeTab, city: activeCity });
  }, [lang, activeTab, activeCity]);

  useEffect(() => {
    if (skipUrlSync.current) return;
    const url = new URL(window.location.href);
    const onGuides = url.pathname.replace(/\/$/, '') === '/guides';
    if (onGuides) return;

    const ticket = url.searchParams.get('ticket');
    const next = buildAppUrl({
      tab: activeTab,
      city: activeCity,
      match: activeMatchNumber,
      ticketId: ticket,
    });
    const target = new URL(next);
    const targetStr = `${target.pathname}${target.search}`;
    const currentStr = `${url.pathname}${url.search}`;
    if (currentStr !== targetStr) {
      window.history.replaceState(window.history.state, '', targetStr);
    }
  }, [activeTab, activeCity, activeMatchNumber]);

  useEffect(() => {
    const onPop = () => {
      const state = readUrlAppState();
      skipUrlSync.current = true;
      setActiveTab(state.tab);
      setActiveCity(state.city);
      setActiveMatchNumber(state.match);
      applyPageSeo(lang, { tab: state.tab, city: state.city });
      skipUrlSync.current = false;
      if (state.scrollToGuides) {
        document.getElementById('ticket-guides')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [lang, setActiveTab, setActiveCity, setActiveMatchNumber]);

  const navigateToTab = useCallback(
    (tab: ListingTab) => {
      const url = new URL(buildAppUrl({ tab, city: activeCity, match: activeMatchNumber }));
      window.history.pushState(null, '', `${url.pathname}${url.search}`);
      setActiveTab(tab);
    },
    [activeCity, activeMatchNumber, setActiveTab],
  );

  return { navigateToTab };
}

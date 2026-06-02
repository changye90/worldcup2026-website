import { useCallback, useEffect, useRef } from 'react';
import type { Lang } from './i18n';
import { t } from './i18n';
import { applyPageSeo, applyTicketPostPageSeo } from './seoDocument';
import { trackPageView } from './analytics';
import { buildAppUrl, readUrlAppState, type ListingTab } from './seoRouting';
import { buildTicketPostPath, migrateLegacyTicketQuery } from './ticketRouting';
import { markTicketDetailInternalEntry, resetPageScrollTop } from './ticketDetailEntry';
import type { TicketWallPost } from './ticketPosts';

const LEGACY_TABS = new Set(['tickets', 'wanted', 'cars', 'hotels', 'odds']);

export function useAppRouting(
  lang: Lang,
  activeTab: ListingTab,
  activeCity: string | null,
  activeMatchNumber: number | null,
  activeNation: string | null,
  ticketPostId: string | null,
  ticketPostForSeo: TicketWallPost | null,
  setActiveTab: (tab: ListingTab) => void,
  setActiveCity: (city: string | null) => void,
  setActiveMatchNumber: (match: number | null) => void,
  setActiveNation: (nation: string | null) => void,
  setTicketPostId: (id: string | null) => void,
) {
  const skipUrlSync = useRef(false);
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    migrateLegacyTicketQuery();

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
    if (state.ticket) {
      setTicketPostId(state.ticket);
      setActiveTab('tickets');
    }
    applyPageSeo(lang, { tab: state.tab, city: state.city });
    if (state.scrollToGuides) {
      window.setTimeout(() => {
        document.getElementById('ticket-guides')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, [lang, setActiveTab, setTicketPostId]);

  useEffect(() => {
    if (ticketPostId && ticketPostForSeo) {
      applyTicketPostPageSeo(lang, ticketPostForSeo, t[lang]);
      return;
    }
    if (!ticketPostId) {
      applyPageSeo(lang, { tab: activeTab, city: activeCity });
    }
  }, [lang, activeTab, activeCity, ticketPostId, ticketPostForSeo]);

  useEffect(() => {
    if (skipUrlSync.current) return;
    if (ticketPostId) return;
    const url = new URL(window.location.href);
    const onGuides = url.pathname.replace(/\/$/, '') === '/guides';
    if (onGuides) return;

    const next = buildAppUrl({
      tab: activeTab,
      city: activeCity,
      match: activeMatchNumber,
      team: activeNation,
    });
    const target = new URL(next);
    const targetStr = `${target.pathname}${target.search}`;
    const currentStr = `${url.pathname}${url.search}`;
    if (currentStr !== targetStr) {
      window.history.replaceState(window.history.state, '', targetStr);
    }
  }, [activeTab, activeCity, activeMatchNumber, activeNation, ticketPostId]);

  useEffect(() => {
    const onPop = () => {
      const state = readUrlAppState();
      skipUrlSync.current = true;
      setActiveTab(state.tab);
      setActiveCity(state.city);
      setActiveMatchNumber(state.match);
      setActiveNation(state.team);
      setTicketPostId(state.ticket);
      skipUrlSync.current = false;
      if (state.ticket) {
        trackPageView({ tab: 'tickets', source: 'back', lang });
      } else {
        applyPageSeo(lang, { tab: state.tab, city: state.city });
        trackPageView({ tab: state.tab, source: 'back', lang });
      }
      if (state.scrollToGuides) {
        document.getElementById('ticket-guides')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [lang, setActiveTab, setActiveCity, setActiveMatchNumber, setActiveNation, setTicketPostId]);

  const navigateToTab = useCallback(
    (tab: ListingTab) => {
      const url = new URL(
        buildAppUrl({ tab, city: activeCity, match: activeMatchNumber, team: activeNation }),
      );
      window.history.pushState(null, '', `${url.pathname}${url.search}`);
      setActiveTab(tab);
      setTicketPostId(null);
    },
    [activeCity, activeMatchNumber, activeNation, setActiveTab, setTicketPostId],
  );

  const navigateToTicketPost = useCallback(
    (id: string) => {
      markTicketDetailInternalEntry();
      resetPageScrollTop();
      window.history.pushState(null, '', buildTicketPostPath(id));
      setTicketPostId(id);
      setActiveTab('tickets');
    },
    [setTicketPostId, setActiveTab],
  );

  const navigateBackFromTicket = useCallback(() => {
    setTicketPostId(null);
    const tab = ticketPostForSeo?.kind === 'buy' ? 'wanted' : 'tickets';
    const url = new URL(
      buildAppUrl({ tab, city: activeCity, match: activeMatchNumber, team: activeNation }),
    );
    window.history.pushState(null, '', `${url.pathname}${url.search}`);
    setActiveTab(tab);
  }, [activeCity, activeMatchNumber, activeNation, ticketPostForSeo?.kind, setTicketPostId, setActiveTab]);

  return { navigateToTab, navigateToTicketPost, navigateBackFromTicket };
}

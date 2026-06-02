import { useState, useRef, useEffect, useMemo } from 'react';
import {
  MapPin, ChevronLeft, ChevronRight, Bed, Car, Building2,
  Zap, Calendar, Phone, Clock,
  Flame, ChevronDown, Check, Ticket, X,
  BarChart3, Tag, Plus, Globe, Search, LogIn, LogOut, List,
} from 'lucide-react';
import { useAuth } from './auth';
import {
  AUTH_RETURN_SELL_GUARANTEE,
  peekAuthReturnIntent,
  consumeAuthReturnIntent,
  saveAuthReturnIntent,
} from './authReturn';
import { AuthModal } from './AuthModal';
import { MyAccountModal } from './MyAccountModal';
import { clearVerifiedSellerSession } from './verifiedSeller';
import {
  matches,
  scheduleDates,
  cities,
  hotels,
  carRentals,
  type Rental,
  type CarRental,
  type Match,
} from './data';
import { t, languages, type Lang, type Translations } from './i18n';
import { AnalyticsEvent, setAnalyticsLang, track, trackPageView } from './analytics';
import { outrightWinnerRows, groupQualifyRows } from './oddsData';
import {
  useTicketWall,
  TicketPostModal,
  TicketPostGrid,
  TicketWantedGrid,
  TicketSafetyDisclaimer,
} from './TicketMarketplace';
import { TicketPostDetailPage } from './TicketPostDetail';
import { migrateLegacyTicketQuery } from './ticketRouting';
import { TicketSeoGuides } from './TicketSeoGuides.tsx';
import { useAppRouting } from './useAppRouting';
import { readUrlAppState, type ListingTab } from './seoRouting';
import { findMatchByNumber, filterBuyPosts, filterSellPosts } from './sellPostResolve';
import { matchInvolvesNation, scheduleNationOptions } from './matchNationFilter';
import { buildTicketShareUrl, shareTicketPost } from './ticketShare';
import { resetPageScrollTop } from './ticketDetailEntry';
import { buildTicketPostPath, parseTicketPostIdFromPath } from './ticketRouting';
import { postHasPlatformGuarantee } from './platformGuarantee';
import { HeroCountdown } from './HeroCountdown';
import type { TicketWallKind, TicketWallPost } from './ticketPosts';

/** Hero background — place `hero.png` in `public/`. */
const HERO_IMAGE_PATH = '/hero.png';

/** When no city is selected, render this many car cards first (full list is heavy). */
const CAR_GRID_PREVIEW = 96;

/** When sheet image URLs are Google Maps proxies (`googleusercontent.com/gps-proxy`) they often 403 off-site — same default as hotel import. */
const RENTAL_IMAGE_FALLBACK =
  'https://images.pexels.com/photos/271639/pexels-photo-271639.jpeg?auto=compress&cs=tinysrgb&w=800';

/** Listing `city` vs schedule / host strip (sheet sometimes uses `Kansas`). */
function listingBelongsToHostCity(listingCity: string, hostCity: string): boolean {
  if (listingCity === hostCity) return true;
  if (hostCity === 'Kansas City' && listingCity === 'Kansas') return true;
  return false;
}

function matchesActiveCity(listingCity: string, active: string | null): boolean {
  if (!active) return true;
  return listingBelongsToHostCity(listingCity, active);
}

function listingInDemandCity(listingCity: string, demandCities: Set<string>): boolean {
  for (const anchor of demandCities) {
    if (listingBelongsToHostCity(listingCity, anchor)) return true;
  }
  return false;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const formatDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return {
    day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.getDate(),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
  };
};

/** Discrete listing id for QA (sheet / export `id`). */
function ListingIdMark({ id }: { id: number }) {
  return (
    <span
      className="pointer-events-auto absolute bottom-1 right-1 z-20 rounded bg-pitch-950/55 px-1 py-px text-[9px] font-mono tabular-nums text-gray-500/65 select-all backdrop-blur-[1px]"
      title="帖子 ID（核对用）"
    >
      {id}
    </span>
  );
}

/** WC2026 host city (as in `carRentals.city`) → nearby tournament stadium for cards. */
const CAR_CITY_TO_STADIUM: Record<string, string> = {
  'Mexico City': 'Estadio Azteca (Azteca Stadium)',
  Guadalajara: 'Estadio Akron (Guadalajara Stadium)',
  Monterrey: 'Estadio BBVA (Monterrey Stadium)',
  'New York': 'MetLife Stadium (Final Venue)',
  Dallas: 'AT&T Stadium',
  'Los Angeles': 'SoFi Stadium',
  Miami: 'Hard Rock Stadium',
  Atlanta: 'Mercedes-Benz Stadium',
  'Atlanta City': 'Mercedes-Benz Stadium',
  'San Francisco': "Levi's Stadium",
  Seattle: 'Lumen Field',
  Philadelphia: 'Lincoln Financial Field',
  Houston: 'NRG Stadium',
  'Kansas City': 'Arrowhead Stadium',
  Boston: 'Gillette Stadium',
  Toronto: 'BMO Field (Toronto Stadium)',
  Vancouver: 'BC Place',
};

function stadiumForCarCity(city: string): string | undefined {
  return CAR_CITY_TO_STADIUM[city];
}

function dayIsGroupOnly(dayMatches: Match[]): boolean {
  return dayMatches.length > 0 && dayMatches.every(m => m.phase === 'group');
}

function matchIsGroup(m: Match): boolean {
  return m.phase === 'group';
}

function formatSchedulePill(iso: string) {
  const { date: d, month } = formatDate(iso);
  return `${d} ${month}`;
}

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [lang, setLang] = useState<Lang>('en');
  const initialUrl = useMemo(() => {
    migrateLegacyTicketQuery();
    return readUrlAppState();
  }, []);
  const nationOptions = useMemo(() => scheduleNationOptions(), []);
  const initialMatchRow =
    initialUrl.match != null ? findMatchByNumber(initialUrl.match) : undefined;
  const initialNation =
    initialUrl.team && nationOptions.some(o => o.name === initialUrl.team) ? initialUrl.team : null;
  const [activeCity, setActiveCity] = useState<string | null>(
    initialUrl.city ?? initialMatchRow?.city ?? null,
  );
  const [activeMatchNumber, setActiveMatchNumber] = useState<number | null>(
    initialMatchRow ? initialUrl.match : null,
  );
  const [activeNation, setActiveNation] = useState<string | null>(initialNation);
  const [activeTab, setActiveTab] = useState<ListingTab>(initialUrl.tab);
  const [postModal, setPostModal] = useState<TicketWallKind | null>(null);
  const [sellGuaranteeOnOpen, setSellGuaranteeOnOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const authReturnHandled = useRef(false);
  const [ticketPostId, setTicketPostId] = useState<string | null>(initialUrl.ticket);
  const [recentPost, setRecentPost] = useState<TicketWallPost | null>(null);
  const [recentPostShareState, setRecentPostShareState] = useState<'idle' | 'copied'>('idle');
  const listingsRef = useRef<HTMLElement>(null);
  const clearListingFilters = () => {
    track(AnalyticsEvent.FilterClear, {
      had_city: Boolean(activeCity),
      had_match: activeMatchNumber != null,
      had_team: Boolean(activeNation),
    });
    setActiveCity(null);
    setActiveMatchNumber(null);
    setActiveNation(null);
  };
  const { handlePost, refreshWall, userPosts, sellPosts, buyPosts, highlightPostId, shareLinkLoading, wallLoading } =
    useTicketWall(
    lang,
    {
      useDetailPage: true,
      onOpenSharePost: post => {
        resetPageScrollTop();
        setTicketPostId(post.id);
        window.history.pushState(null, '', buildTicketPostPath(post.id));
      },
    },
  );

  const ticketPostForSeo = useMemo(
    () => (ticketPostId ? userPosts.find(p => p.id === ticketPostId) ?? null : null),
    [ticketPostId, userPosts],
  );

  useEffect(() => {
    if (!ticketPostId) return;
    if (parseTicketPostIdFromPath(window.location.pathname) !== ticketPostId) {
      window.history.replaceState(window.history.state, '', buildTicketPostPath(ticketPostId));
    }
  }, [ticketPostId]);

  const { navigateToTab, navigateToTicketPost, navigateBackFromTicket } = useAppRouting(
    lang,
    activeTab,
    activeCity,
    activeMatchNumber,
    activeNation,
    ticketPostId,
    ticketPostForSeo,
    setActiveTab,
    setActiveCity,
    setActiveMatchNumber,
    setActiveNation,
    setTicketPostId,
  );

  const openTicketDetail = (id: string) => {
    const post = userPosts.find(p => p.id === id);
    if (post) {
      track(AnalyticsEvent.TicketCardClick, {
        post_id: post.id,
        kind: post.kind,
        is_user: Boolean(post.isUser),
        from: 'wall',
      });
    }
    setActiveTab(post?.kind === 'buy' ? 'wanted' : 'tickets');
    navigateToTicketPost(id);
  };

  const activeMatch = activeMatchNumber != null ? findMatchByNumber(activeMatchNumber) : undefined;
  const filteredSellPosts = useMemo(
    () => filterSellPosts(sellPosts, { activeCity, activeMatchNumber, activeNation }),
    [sellPosts, activeCity, activeMatchNumber, activeNation],
  );
  const filteredBuyPosts = useMemo(
    () => filterBuyPosts(buyPosts, { activeCity, activeMatchNumber, activeNation }),
    [buyPosts, activeCity, activeMatchNumber, activeNation],
  );
  const nationMatchCount = useMemo(() => {
    if (!activeNation) return 0;
    return matches.filter(m => matchInvolvesNation(m, activeNation)).length;
  }, [activeNation]);
  const [scheduleExpandedDate, setScheduleExpandedDate] = useState<string | null>(() => {
    const dates = [...new Set(matches.map(m => m.date))].sort();
    return dates[0] ?? null;
  });
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [nationOpen, setNationOpen] = useState(false);
  const [nationSearch, setNationSearch] = useState('');
  const [navSolid, setNavSolid] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [carsExpanded, setCarsExpanded] = useState(false);
  const [hotelsExpanded, setHotelsExpanded] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const hostCitiesRef = useRef<HTMLDivElement>(null);
  const scheduleSectionRef = useRef<HTMLElement>(null);
  const tr = t[lang];
  const { user, loading: authLoading, authConfigured, openAuthModal, signOut, closeAuthModal } =
    useAuth();

  /** After email verification link: return to sell form + platform guarantee section. */
  useEffect(() => {
    if (authLoading || authReturnHandled.current) return;

    const url = new URL(window.location.href);
    const authReturn = url.searchParams.get('auth_return');
    const fromQuery = authReturn === AUTH_RETURN_SELL_GUARANTEE;
    const intent = peekAuthReturnIntent();

    if (!fromQuery && !intent) return;

    const wantGuarantee = fromQuery || Boolean(intent?.platformGuarantee);

    const finishRestore = () => {
      consumeAuthReturnIntent();
      authReturnHandled.current = true;
      if (ticketPostId) setTicketPostId(null);
      setActiveTab('tickets');
      setPostModal('sell');
      if (wantGuarantee) setSellGuaranteeOnOpen(true);
      if (authReturn) {
        url.searchParams.delete('auth_return');
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
      }
      closeAuthModal();
      window.setTimeout(() => {
        listingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    };

    if (!user) {
      saveAuthReturnIntent({ openSellModal: true, platformGuarantee: wantGuarantee });
      openAuthModal('sign_in', 'verified_listing');
      return;
    }

    if (!user.emailVerified) {
      saveAuthReturnIntent({ openSellModal: true, platformGuarantee: wantGuarantee });
      openAuthModal('sign_in', 'verified_listing');
      return;
    }

    finishRestore();
  }, [authLoading, user, ticketPostId, openAuthModal, closeAuthModal]);

  const onShareRecentPost = async () => {
    if (!recentPost) return;
    track(AnalyticsEvent.TicketShare, {
      post_id: recentPost.id,
      kind: recentPost.kind,
      is_user: true,
      source: 'post_success_modal',
    });
    const result = await shareTicketPost(recentPost, tr);
    setRecentPostShareState(result === 'copied' ? 'copied' : 'idle');
    if (result === 'copied') {
      window.setTimeout(() => setRecentPostShareState('idle'), 1200);
      window.setTimeout(() => setRecentPost(null), 900);
    } else {
      setRecentPost(null);
    }
  };

  const onCopyRecentPostLink = async () => {
    if (!recentPost) return;
    await navigator.clipboard.writeText(buildTicketShareUrl(recentPost));
    track(AnalyticsEvent.TicketDetailShareCopy, {
      post_id: recentPost.id,
      kind: recentPost.kind,
      source: 'post_success_modal',
    });
    setRecentPostShareState('copied');
    window.setTimeout(() => setRecentPostShareState('idle'), 1200);
    window.setTimeout(() => setRecentPost(null), 900);
  };

  const pageViewBoot = useRef(false);

  useEffect(() => {
    setAnalyticsLang(lang);
  }, [lang]);

  useEffect(() => {
    trackPageView({
      tab: activeTab,
      lang,
      source: pageViewBoot.current ? 'tab' : 'load',
    });
    pageViewBoot.current = true;
  }, [activeTab, lang]);

  useEffect(() => {
    const handler = () => setNavSolid(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    setCarsExpanded(false);
    setHotelsExpanded(false);
  }, [activeCity, activeMatchNumber, activeNation]);

  // Close lang dropdown on outside click
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('lang-menu');
      if (el && !el.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);

  const scroll = (dir: 'left' | 'right') => {
    scheduleRef.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };
  const scrollHostCities = (dir: 'left' | 'right') => {
    hostCitiesRef.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  const matchesForDate = (date: string) => {
    const list = matches.filter(m => m.date === date);
    if (!activeNation) return list;
    return list.filter(m => matchInvolvesNation(m, activeNation));
  };
  const filteredNationOptions = useMemo(() => {
    const q = nationSearch.trim().toLowerCase();
    if (!q) return nationOptions;
    return nationOptions.filter(o => o.name.toLowerCase().includes(q));
  }, [nationOptions, nationSearch]);
  const expandedMatches = scheduleExpandedDate
    ? matchesForDate(scheduleExpandedDate).slice().sort((a, b) => a.kickoffTime.localeCompare(b.kickoffTime))
    : [];
  const highDemandCities = scheduleExpandedDate
    ? new Set(matchesForDate(scheduleExpandedDate).map(m => m.city))
    : new Set<string>();

  const filteredHotels = activeCity ? hotels.filter(r => matchesActiveCity(r.city, activeCity)) : hotels;
  const filteredCars = activeCity ? carRentals.filter(r => r.city === activeCity) : carRentals;
  const carsForGrid =
    activeCity || carsExpanded || filteredCars.length <= CAR_GRID_PREVIEW
      ? filteredCars
      : filteredCars.slice(0, CAR_GRID_PREVIEW);
  const carsShowExpand =
    activeTab === 'cars' && !activeCity && !carsExpanded && filteredCars.length > CAR_GRID_PREVIEW;
  const hotelsForGrid =
    activeCity || hotelsExpanded || filteredHotels.length <= CAR_GRID_PREVIEW
      ? filteredHotels
      : filteredHotels.slice(0, CAR_GRID_PREVIEW);
  const hotelsShowExpand =
    activeTab === 'hotels' &&
    !activeCity &&
    !hotelsExpanded &&
    filteredHotels.length > CAR_GRID_PREVIEW;

  const filterByScheduleMatch = (match: Match) => {
    const clearing = activeMatchNumber === match.matchNumber;
    track(AnalyticsEvent.ScheduleMatch, {
      match_id: match.id,
      match_number: match.matchNumber,
      city: match.city,
      date: match.date,
      action: clearing ? 'clear' : 'select',
    });
    if (clearing) {
      setActiveCity(null);
      setActiveMatchNumber(null);
      setActiveNation(null);
    } else {
      setActiveMatchNumber(match.matchNumber);
      setActiveCity(match.city);
      setActiveNation(null);
    }
    setScheduleOpen(false);
    setTimeout(() => listingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const trackFilterPanelOpen = (panel: 'schedule' | 'cities' | 'nation', opening: boolean) => {
    if (!opening) return;
    const ev =
      panel === 'schedule'
        ? AnalyticsEvent.FilterScheduleOpen
        : panel === 'cities'
          ? AnalyticsEvent.FilterCitiesOpen
          : AnalyticsEvent.FilterNationOpen;
    track(ev);
  };

  const currentLang = languages.find(l => l.code === lang)!;

  return (
    <div className="min-h-screen bg-pitch-900 text-white font-sans">

      {/* ── STICKY NAVBAR ─────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        navSolid
          ? 'bg-pitch-900/90 backdrop-blur-xl border-b border-grass-700/30 shadow-2xl shadow-black/40'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">

          {/* Brand */}
          <div className="min-w-0 max-w-[38%] flex-shrink sm:max-w-none">
            <h1 className="truncate text-sm font-bold leading-tight tracking-tight text-white sm:text-[17px]">
              <span>{tr.brand}</span>
              <span className="text-grass-400"> · WC 2026</span>
            </h1>
            <p className="mt-0.5 hidden truncate text-[9px] uppercase leading-none tracking-widest text-gray-400 sm:block">
              {tr.brandSub}
            </p>
          </div>

          {/* Right: schedule + language (category nav moved to hero) */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <Calendar className="w-3.5 h-3.5 text-gold-400" />
              <span>{tr.scheduleFullRange}</span>
            </div>

            <button
              onClick={() => {
                track(AnalyticsEvent.HeaderSchedule);
                setScheduleOpen(true);
                scheduleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 text-gray-400 hover:text-white hover:bg-white/5"
            >
              <Calendar className="w-3.5 h-3.5" />
              {lang === 'pt' ? 'Calendário' : lang === 'es' ? 'Calendario' : 'Schedule'}
            </button>

            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-gray-700/80 bg-pitch-700/60 p-2 text-xs font-medium text-gray-300 transition hover:border-grass-600/50 hover:text-white sm:px-2.5"
              title={tr.accountTitle}
            >
              <List className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{tr.accountTitle}</span>
            </button>

            {authConfigured ? (
              user ? (
                <div className="flex items-center gap-0.5 sm:gap-1.5">
                  {!user.emailVerified ? (
                    <button
                      type="button"
                      onClick={() => openAuthModal('sign_in', 'header')}
                      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/20 sm:px-2.5 sm:py-1.5 sm:text-[11px]"
                    >
                      <span className="max-w-[4.5rem] truncate sm:max-w-none">{tr.authVerifyEmail}</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      void signOut();
                      clearVerifiedSellerSession();
                      track(AnalyticsEvent.AuthSignOut);
                    }}
                    className="flex items-center gap-1 rounded-lg p-2 text-xs font-medium text-gray-400 transition hover:bg-white/5 hover:text-white sm:px-2.5"
                    title={tr.authSignOut}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tr.authSignOut}</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('sign_in', 'header')}
                  className="flex items-center gap-1 rounded-lg border border-gray-700/80 bg-pitch-700/60 p-2 text-xs font-medium text-gray-300 transition hover:border-grass-600/50 hover:text-white sm:px-2.5"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tr.authSignIn}</span>
                </button>
              )
            ) : null}

            {/* Language switcher */}
            <div id="lang-menu" className="relative">
              <button
                onClick={() => {
                  setLangOpen(o => {
                    if (!o) track(AnalyticsEvent.HeaderLangOpen, { lang });
                    return !o;
                  });
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-pitch-700/80 border border-gray-700 hover:border-grass-600/60 text-sm text-gray-300 hover:text-white transition-all duration-200"
              >
                <span className="text-base leading-none">{currentLang.flag}</span>
                <span className="hidden sm:inline font-medium">{currentLang.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
              </button>

              {langOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-pitch-800 border border-gray-700/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                  {languages.map(l => (
                    <button
                      key={l.code}
                      onClick={() => {
                        track(AnalyticsEvent.HeaderLangSelect, { lang: l.code, from: lang });
                        setLang(l.code);
                        setLangOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors duration-150 ${
                        lang === l.code
                          ? 'bg-grass-600/20 text-grass-400'
                          : 'text-gray-300 hover:bg-pitch-700 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{l.flag}</span>
                        <span className="font-medium">{l.label}</span>
                      </div>
                      {lang === l.code && <Check className="w-4 h-4 text-grass-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {ticketPostId ? (
        <TicketPostDetailPage
          postId={ticketPostId}
          wallPosts={userPosts}
          tr={tr}
          lang={lang}
          onBack={navigateBackFromTicket}
          onOpenGuides={() => {
            navigateBackFromTicket();
            window.setTimeout(() => {
              document.getElementById('ticket-guides')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 150);
          }}
        />
      ) : (
        <>
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section
        className="relative flex flex-col overflow-hidden bg-pitch-900 py-3 sm:py-4"
        style={{ minHeight: 'min(44vh, 420px)' }}
      >
        <div className="pointer-events-none absolute inset-0">
          <img
            src={HERO_IMAGE_PATH}
            alt="Stadium"
            className="h-full w-full object-cover object-center opacity-45"
            decoding="async"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-pitch-900/97 via-pitch-900/70 to-pitch-900/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-pitch-900/10 via-transparent to-pitch-900" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-1 flex-col gap-6 px-4 pb-2 pt-20 sm:px-6 sm:pb-3 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="min-w-0 flex-1 text-left">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-grass-500/20 bg-grass-500/10 px-3 py-1 text-xs text-grass-400">
                <Zap className="h-3 w-3" />
                <span>{tr.heroTag}</span>
              </div>

              <h1 className="mb-3 text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl">
                {tr.heroH1}
              </h1>

              <p className="mb-5 max-w-xl text-sm leading-[1.75] text-gray-300 sm:text-base">
                {tr.heroSubhead}{' '}
                <span className="block text-xs text-gray-500 sm:inline sm:text-sm">{tr.heroSubheadExtras}</span>
              </p>

              <div className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-start">
                <button
                  type="button"
                  onClick={() => {
                    track(AnalyticsEvent.HeroSell);
                    setPostModal('sell');
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-pitch-900 shadow-xl shadow-black/30 transition hover:bg-gray-100 active:scale-[0.98] sm:w-auto lg:justify-start"
                >
                  <Plus className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  {tr.heroCtaSell}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    track(AnalyticsEvent.HeroBuy);
                    setPostModal('buy');
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-black/20 backdrop-blur-sm transition hover:border-white/45 hover:bg-white/15 active:scale-[0.98] sm:w-auto"
                >
                  <Ticket className="h-4 w-4 shrink-0" />
                  {tr.heroCtaBuy}
                </button>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                {[
                  { icon: Ticket, label: tr.statTickets, color: 'text-gold-400' },
                  { icon: Car, label: tr.statCars, color: 'text-gold-400' },
                  { icon: Building2, label: tr.statHotels, color: 'text-grass-400' },
                  { icon: BarChart3, label: tr.statOdds, color: 'text-cyan-300' },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-1.5 text-gray-300">
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full shrink-0 lg:max-w-[18rem]">
              <HeroCountdown tr={tr} />
            </div>
        </div>
      </section>

      {/* ── FILTERS: compact toggles + expandable schedule / cities ─────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="schedule"
            ref={scheduleSectionRef}
            onClick={() => {
              setScheduleOpen(o => {
                trackFilterPanelOpen('schedule', !o);
                return !o;
              });
              if (!scheduleOpen) setNationOpen(false);
            }}
            aria-expanded={scheduleOpen}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              scheduleOpen || activeMatchNumber != null || activeNation
                ? 'border-emerald-500/50 bg-emerald-950/50 text-emerald-100 ring-1 ring-emerald-500/30'
                : 'border-gray-700/80 bg-pitch-800/80 text-gray-300 hover:border-gray-600 hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span>{tr.filterScheduleBtn}</span>
            {activeMatchNumber != null && !scheduleOpen ? (
              <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-gold-200">
                #{activeMatchNumber}
              </span>
            ) : null}
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${scheduleOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={() => {
              setCitiesOpen(o => {
                trackFilterPanelOpen('cities', !o);
                return !o;
              });
              if (!citiesOpen) setNationOpen(false);
            }}
            aria-expanded={citiesOpen}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              citiesOpen || (activeCity != null && activeMatchNumber == null)
                ? 'border-grass-500/50 bg-grass-950/40 text-grass-100 ring-1 ring-grass-500/30'
                : 'border-gray-700/80 bg-pitch-800/80 text-gray-300 hover:border-gray-600 hover:text-white'
            }`}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span>{tr.filterCitiesBtn}</span>
            {activeCity && activeMatchNumber == null && !citiesOpen ? (
              <span className="max-w-[5.5rem] truncate text-[10px] font-bold text-grass-200">{activeCity}</span>
            ) : null}
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${citiesOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={() => {
              setNationOpen(o => {
                trackFilterPanelOpen('nation', !o);
                return !o;
              });
              if (!nationOpen) {
                setCitiesOpen(false);
                setScheduleOpen(false);
              }
            }}
            aria-expanded={nationOpen}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              nationOpen || activeNation
                ? 'border-sky-500/50 bg-sky-950/50 text-sky-100 ring-1 ring-sky-500/30'
                : 'border-gray-700/80 bg-pitch-800/80 text-gray-300 hover:border-gray-600 hover:text-white'
            }`}
          >
            <Globe className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span>{tr.filterNationBtn}</span>
            {activeNation && !nationOpen ? (
              <span className="max-w-[5.5rem] truncate text-[10px] font-bold text-sky-200">
                {activeNation}
              </span>
            ) : null}
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${nationOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
          {(activeCity || activeMatchNumber != null || activeNation) && (
            <button
              type="button"
              onClick={clearListingFilters}
              className="rounded-lg border border-grass-600/40 px-2.5 py-2 text-xs font-medium text-grass-400 transition hover:text-grass-300 sm:text-sm"
            >
              {tr.clearFilter}
            </button>
          )}
        </div>

        {nationOpen ? (
          <div className="mt-3 rounded-xl border border-sky-700/25 bg-pitch-800/60 p-3 sm:p-4">
            <p className="mb-3 text-[11px] text-gray-500 sm:text-xs">{tr.filterNationHint}</p>
            <input
              type="search"
              value={nationSearch}
              onChange={e => setNationSearch(e.target.value)}
              placeholder={tr.filterNationSearch}
              className="mb-3 w-full rounded-lg border border-gray-700/80 bg-pitch-950/90 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-sky-500/50 focus:outline-none"
            />
            <div className="max-h-[min(42vh,320px)] overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                {filteredNationOptions.map(opt => {
                  const isActive = activeNation === opt.name;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          track(AnalyticsEvent.FilterNation, {
                            nation: opt.name,
                            action: 'clear',
                            match_count: opt.matchCount,
                          });
                          setActiveNation(null);
                        } else {
                          track(AnalyticsEvent.FilterNation, {
                            nation: opt.name,
                            action: 'select',
                            match_count: opt.matchCount,
                          });
                          setActiveNation(opt.name);
                          setActiveCity(null);
                          setActiveMatchNumber(null);
                          setScheduleOpen(true);
                          const firstDate = scheduleDates.find(d =>
                            matches.some(m => m.date === d && matchInvolvesNation(m, opt.name)),
                          );
                          if (firstDate) setScheduleExpandedDate(firstDate);
                          setNationOpen(false);
                          setTimeout(
                            () => listingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                            100,
                          );
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition sm:text-sm ${
                        isActive
                          ? 'border-sky-400/60 bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/40'
                          : 'border-gray-700/80 bg-pitch-900/80 text-gray-200 hover:border-sky-600/40 hover:text-white'
                      }`}
                    >
                      <span className="text-base leading-none" aria-hidden>
                        {opt.flag}
                      </span>
                      <span>{opt.name}</span>
                      <span className="text-[10px] font-normal tabular-nums text-gray-500">
                        {tr.filterNationMatchCount(opt.matchCount)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {filteredNationOptions.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">{tr.formMatchFilterNoResults}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {scheduleOpen ? (
          <div className="scroll-mt-[72px] mt-3 rounded-xl border border-grass-700/25 bg-pitch-800/60 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[11px] text-gray-500 sm:text-xs">
                {tr.scheduleFullRange}
                {import.meta.env.DEV && <span className="ml-1 text-cyan-500/90">· grid UI</span>}
              </p>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => scroll('left')}
                  className="rounded-lg border border-gray-700/80 bg-pitch-950/90 p-1.5 text-gray-400 hover:text-white"
                  aria-label="Scroll schedule left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scroll('right')}
                  className="rounded-lg border border-gray-700/80 bg-pitch-950/90 p-1.5 text-gray-400 hover:text-white"
                  aria-label="Scroll schedule right"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          <div className="-mx-3 sm:-mx-4">
            <div
              ref={scheduleRef}
              className="scrollbar-hide flex gap-2 overflow-x-auto scroll-smooth pb-2 pt-1 pl-4 pr-4 snap-x snap-mandatory sm:gap-2.5 sm:pl-6 sm:pr-6 [-webkit-overflow-scrolling:touch]"
            >
            {scheduleDates.map(date => {
              const { day, date: d, month } = formatDate(date);
              const dayMatches = matchesForDate(date);
              const isSelected = scheduleExpandedDate === date;
              const isMatchDay = dayMatches.length > 0;
              const groupOnly = dayIsGroupOnly(dayMatches);

              const basePill =
                'flex h-[5.5rem] w-[3.15rem] shrink-0 snap-start flex-col items-center justify-between rounded-xl border py-1.5 px-1 text-center transition sm:h-[6.25rem] sm:w-[3.65rem]';
              const palette = !isMatchDay
                ? 'border-gray-700/55 bg-pitch-900/40 opacity-60'
                : groupOnly
                ? 'border-cyan-600/50 bg-cyan-950/30 hover:border-cyan-500/70'
                : 'border-amber-600/50 bg-amber-950/25 hover:border-amber-500/70';
              const selectedRing = isSelected
                ? groupOnly
                  ? 'ring-2 ring-cyan-400'
                  : 'ring-2 ring-amber-400'
                : '';

              const countCircle =
                !isMatchDay ? (
                  <span className="h-5 w-5 rounded-full border border-dashed border-gray-700/70 sm:h-6 sm:w-6" aria-hidden />
                ) : (
                  <span
                    className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border px-1 text-[10px] font-bold tabular-nums sm:h-6 sm:text-xs ${
                      groupOnly
                        ? 'border-cyan-500/55 bg-cyan-500/20 text-cyan-100'
                        : 'border-amber-500/55 bg-amber-500/20 text-amber-100'
                    }`}
                  >
                    {dayMatches.length}
                  </span>
                );

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => {
                    track(AnalyticsEvent.ScheduleDate, { date, match_count: dayMatches.length });
                    setScheduleExpandedDate(date);
                  }}
                  className={`${basePill} ${palette} ${selectedRing}`}
                >
                  <span className="text-[10px] font-semibold uppercase leading-none text-gray-400 sm:text-xs">{day}</span>
                  <span className="text-xl font-extrabold leading-none tabular-nums text-white sm:text-2xl">{d}</span>
                  <span className="text-[10px] leading-none text-gray-500 sm:text-xs">{month}</span>
                  {countCircle}
                </button>
              );
            })}
            </div>
          </div>

          {scheduleExpandedDate && (
            <>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500 sm:text-sm">
                {tr.matchesLabel(expandedMatches.length)}
              </p>
              {expandedMatches.length === 0 ? (
                <p className="mt-4 rounded-xl border border-gray-800/80 bg-pitch-950/50 py-8 text-center text-sm text-gray-500 sm:text-base">
                  {tr.noMatchesDay}
                </p>
              ) : (
                <div className="mt-3 grid max-h-[min(62vh,560px)] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {expandedMatches.map(m => {
                    const isG = matchIsGroup(m);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => filterByScheduleMatch(m)}
                        className={`rounded-xl border bg-pitch-950/90 p-3 text-left transition hover:bg-pitch-900 sm:p-4 ${
                          isG
                            ? 'border-cyan-600/40 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.06)]'
                            : 'border-amber-600/45 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.07)]'
                        } ${activeMatchNumber === m.matchNumber ? 'ring-2 ring-gold-400/80' : ''}`}
                      >
                        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-1.5">
                          <span
                            className={`truncate font-mono text-xs font-bold tabular-nums sm:text-sm ${
                              isG ? 'text-cyan-300' : 'text-amber-300'
                            }`}
                          >
                            # {tr.matchNumber} {m.matchNumber}
                          </span>
                          <span
                            className={`max-w-[7.5rem] justify-self-center rounded-full border px-2 py-1 text-center text-[10px] font-bold uppercase leading-snug line-clamp-2 break-words sm:max-w-[9rem] sm:text-xs ${
                              isG
                                ? 'border-cyan-600/50 bg-cyan-950/90 text-cyan-100'
                                : 'border-amber-600/55 bg-amber-950/90 text-amber-50'
                            }`}
                          >
                            {isG ? tr.matchCardBandGroup : tr.phaseLabel(m.phase)}
                          </span>
                          <span className="flex items-center justify-end gap-1 text-xs font-semibold tabular-nums text-yellow-400 sm:text-sm">
                            <Clock className="h-4 w-4 shrink-0 opacity-90 sm:h-5 sm:w-5" />
                            {m.kickoffTime}
                          </span>
                        </div>
                        <div className="mb-2 flex items-stretch justify-between gap-2">
                          <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                            <span className="text-lg leading-none sm:text-2xl">{m.flag1}</span>
                            <span className="w-full truncate text-center text-xs font-bold leading-snug text-white sm:text-sm">
                              {m.homeTeam}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center self-center rounded-md bg-orange-500 px-2 py-1 text-xs font-black uppercase text-pitch-900 sm:text-sm">
                            vs
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                            <span className="text-lg leading-none sm:text-2xl">{m.flag2}</span>
                            <span className="w-full truncate text-center text-xs font-bold leading-snug text-white sm:text-sm">
                              {m.awayTeam}
                            </span>
                          </div>
                        </div>
                        <div className="flex min-w-0 items-center gap-1.5 text-xs leading-snug text-gray-400 sm:text-sm">
                          <MapPin className="h-4 w-4 shrink-0 text-emerald-400 sm:h-5 sm:w-5" />
                          <span className="shrink-0 font-semibold text-emerald-400/95">{m.city}</span>
                          <span className="shrink-0 text-gray-600">·</span>
                          <span className="min-w-0 truncate">{m.stadium}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
          </div>
        ) : null}

        {citiesOpen ? (
          <div className="mt-3 rounded-xl border border-grass-700/25 bg-pitch-800/40 p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] text-gray-500 sm:text-xs">{tr.citiesDesc}</p>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => scrollHostCities('left')}
                  className="rounded-lg border border-gray-700 bg-pitch-700 p-1.5 text-gray-400 hover:text-grass-400"
                  aria-label="Scroll cities left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollHostCities('right')}
                  className="rounded-lg border border-gray-700 bg-pitch-700 p-1.5 text-gray-400 hover:text-grass-400"
                  aria-label="Scroll cities right"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
        <p className="mb-2 text-[11px] text-gray-600">
          {lang === 'es'
            ? 'Desliza horizontalmente para ver más ciudades.'
            : lang === 'pt'
            ? 'Deslize horizontalmente para ver mais cidades.'
            : 'Swipe left/right to view more cities.'}
        </p>

        <div className="-mx-3 sm:-mx-4">
        <div ref={hostCitiesRef} className="overflow-x-auto pb-2 scroll-smooth [-webkit-overflow-scrolling:touch]">
          <div className="grid min-w-max grid-flow-col grid-rows-2 auto-cols-[7.5rem] gap-2 sm:auto-cols-[8.5rem] sm:gap-3">
            {cities.map(city => {
              const isActive =
                activeMatchNumber == null && activeCity === city.name;
              const isHighDemand = highDemandCities.has(city.name);
              return (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => {
                    track(AnalyticsEvent.FilterCity, {
                      city: city.name,
                      action: isActive ? 'clear' : 'select',
                      high_demand: isHighDemand,
                    });
                    setActiveMatchNumber(null);
                    setActiveNation(null);
                    setActiveCity(isActive ? null : city.name);
                    setCitiesOpen(false);
                    setTimeout(() => listingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                  }}
                  className={`relative group rounded-xl overflow-hidden aspect-square transition-all duration-300 ${
                    isActive ? 'ring-2 ring-grass-400 scale-95' : 'hover:scale-[1.03]'
                  }`}
                >
                  <img src={city.imageUrl} alt={city.name} className={`w-full h-full object-cover transition-all duration-500 ${isActive ? 'brightness-75' : 'brightness-50 group-hover:brightness-75'}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  {isActive && <div className="absolute inset-0 bg-grass-500/10" />}
                  {isHighDemand && (
                    <div className="absolute top-1 left-1 bg-red-500/90 rounded-md px-1 py-0.5 flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5 text-white" />
                      <span className="text-[9px] text-white font-bold leading-none">HOT</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-1.5">
                    <div className="text-white font-bold text-[10px] leading-tight truncate">{city.name}</div>
                    <div className="text-gray-400 text-[8px] leading-none mt-0.5 truncate">{city.landmark}</div>
                    <div className="text-gray-300 text-[9px] leading-none mt-0.5">{city.matches} {lang === 'pt' ? 'jogos' : lang === 'es' ? 'partidos' : 'matches'}</div>
                  </div>
                  {isActive && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-grass-400 flex items-center justify-center">
                      <span className="text-pitch-900 text-[8px] font-bold">✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        </div>
          </div>
        ) : null}
      </div>

      {/* ── LISTINGS ──────────────────────────────────────────────────── */}
      <section ref={listingsRef} className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 pt-1 sm:pt-3">
        {(activeMatchNumber != null || activeCity || activeNation) && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-grass-400">
              {activeMatch && activeMatchNumber != null
                ? tr.listingsFilteredMatch(
                    activeMatchNumber,
                    activeMatch.homeTeam,
                    activeMatch.awayTeam,
                  )
                : activeNation
                  ? tr.listingsFilteredNation(activeNation, nationMatchCount)
                  : activeCity}
            </p>
            {activeCity && highDemandCities.has(activeCity) && (
              <div className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1">
                <Flame className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs font-semibold text-red-400">{tr.highDemand}</span>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="sticky top-[46px] z-40 -mx-4 mb-4 border-b border-gray-800/60 bg-pitch-900/95 px-4 py-1.5 backdrop-blur-xl sm:-mx-6 sm:top-[52px] sm:mb-6 sm:px-6 sm:py-2">
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-700/50 bg-pitch-800 p-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
            {([
              {
                key: 'tickets' as ListingTab,
                label: tr.tabTickets,
                icon: Ticket,
                count: sellPosts.length,
                activeCls: 'bg-gradient-to-r from-gold-500 to-gold-600 text-pitch-900 shadow-lg shadow-gold-900/35',
                badgeCls: 'bg-pitch-900/20 text-pitch-900',
              },
              {
                key: 'wanted' as ListingTab,
                label: tr.tabWanted,
                icon: Search,
                count: buyPosts.length,
                activeCls: 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-900/35',
                badgeCls: 'bg-white/20 text-white',
              },
              { key: 'cars' as ListingTab, label: tr.tabCars, icon: Car, count: filteredCars.length, activeCls: 'bg-grass-600 text-white shadow-lg shadow-grass-900/40', badgeCls: 'bg-grass-500/50 text-white' },
              { key: 'hotels' as ListingTab, label: tr.tabHotels, icon: Building2, count: filteredHotels.length, activeCls: 'bg-grass-600 text-white shadow-lg shadow-grass-900/40', badgeCls: 'bg-grass-500/50 text-white' },
              { key: 'odds' as ListingTab, label: tr.tabOdds, icon: BarChart3, activeCls: 'bg-grass-600 text-white shadow-lg shadow-grass-900/40', badgeCls: 'bg-grass-500/50 text-white' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  track(AnalyticsEvent.ListingsTab, { tab: tab.key });
                  navigateToTab(tab.key);
                }}
                className={`flex min-w-[5.5rem] shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200 sm:min-w-0 sm:shrink sm:px-3 sm:py-2.5 sm:text-sm ${
                  activeTab === tab.key ? tab.activeCls : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
                {'count' in tab && typeof tab.count === 'number' ? (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 tabular-nums ${
                      activeTab === tab.key ? tab.badgeCls : 'bg-pitch-700 text-gray-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'tickets' && (
          <div className="mb-10">
            <div className="mb-3 hidden items-center justify-between gap-3 sm:mb-5 sm:flex">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gold-200">
                <Tag className="h-4 w-4 shrink-0" />
                {tr.tabTicketSell}
              </h4>
              <span className="rounded-full border border-gold-500/30 bg-gold-500/10 px-2.5 py-0.5 text-xs font-mono tabular-nums text-gold-300">
                {filteredSellPosts.length}
              </span>
            </div>
            <TicketPostGrid
              posts={sellPosts}
              tr={tr}
              lang={lang}
              activeCity={activeCity}
              activeMatchNumber={activeMatchNumber}
              activeNation={activeNation}
              highlightPostId={highlightPostId}
              shareLinkLoading={shareLinkLoading}
              wallLoading={wallLoading}
              onViewDetails={openTicketDetail}
            />
          </div>
        )}
        {activeTab === 'wanted' && (
          <div className="mb-10">
            <div className="mb-3 hidden flex-wrap items-center justify-between gap-3 sm:mb-5 sm:flex">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-sky-200">
                <Search className="h-4 w-4 shrink-0" />
                {tr.tabTicketBuy}
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPostModal('buy')}
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-200 hover:bg-sky-500/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {tr.heroCtaBuy}
                </button>
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-mono tabular-nums text-sky-300">
                  {filteredBuyPosts.length}
                </span>
              </div>
            </div>
            <TicketWantedGrid
              posts={buyPosts}
              tr={tr}
              activeCity={activeCity}
              activeMatchNumber={activeMatchNumber}
              activeNation={activeNation}
              highlightPostId={highlightPostId}
              shareLinkLoading={shareLinkLoading}
              wallLoading={wallLoading}
              onViewDetails={openTicketDetail}
            />
          </div>
        )}
        {activeTab === 'hotels' && (
          <>
            {hotelsShowExpand && (
              <p className="mb-4 text-sm text-gray-400 max-w-2xl">
                {tr.hotelsPreviewHint(CAR_GRID_PREVIEW, filteredHotels.length)}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredHotels.length === 0
                ? <EmptyState label={tr.noHotels} />
                : hotelsForGrid.map(r => (
                  <RentalCard key={r.id} rental={r} highDemand={listingInDemandCity(r.city, highDemandCities)} lang={lang} />
                ))
              }
            </div>
            {hotelsShowExpand && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    track(AnalyticsEvent.ListingExpand, { tab: 'hotels', total: filteredHotels.length });
                    setHotelsExpanded(true);
                  }}
                  className="rounded-xl border border-gray-600 bg-pitch-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-grass-500 hover:text-grass-300"
                >
                  {tr.hotelsLoadFull(filteredHotels.length)}
                </button>
              </div>
            )}
          </>
        )}
        {activeTab === 'cars' && (
          <>
            {carsShowExpand && (
              <p className="mb-4 text-sm text-gray-400 max-w-2xl">
                {tr.carsPreviewHint(CAR_GRID_PREVIEW, filteredCars.length)}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCars.length === 0
                ? <EmptyState label={tr.noCars} />
                : carsForGrid.map(c => <CarCard key={c.id} car={c} highDemand={listingInDemandCity(c.city, highDemandCities)} lang={lang} />)
              }
            </div>
            {carsShowExpand && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    track(AnalyticsEvent.ListingExpand, { tab: 'cars', total: filteredCars.length });
                    setCarsExpanded(true);
                  }}
                  className="rounded-xl border border-gray-600 bg-pitch-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-grass-500 hover:text-grass-300"
                >
                  {tr.carsLoadFull(filteredCars.length)}
                </button>
              </div>
            )}
          </>
        )}
        {activeTab === 'odds' && <OddsPanel lang={lang} tr={tr} />}
      </section>

      <TicketSeoGuides lang={lang} />
        </>
      )}

      {postModal ? (
        <TicketPostModal
          kind={postModal}
          lang={lang}
          tr={tr}
          openWithPlatformGuarantee={sellGuaranteeOnOpen}
          onClose={() => {
            setPostModal(null);
            setSellGuaranteeOnOpen(false);
          }}
          onSubmit={post => {
            track(AnalyticsEvent.TicketPostSubmit, {
              kind: post.kind,
              post_id: post.id,
              is_user: true,
              platform_guarantee: postHasPlatformGuarantee(post),
            });
            handlePost(post);
            openTicketDetail(post.id);
            window.setTimeout(() => {
              setRecentPost(post);
              setRecentPostShareState('idle');
            }, 920);
          }}
        />
      ) : null}

      {recentPost ? (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-pitch-950/80 backdrop-blur-sm"
            aria-label={tr.ticketModalClose}
            onClick={() => setRecentPost(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-gold-500/25 bg-gradient-to-br from-pitch-800 to-pitch-900 p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setRecentPost(null)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-500 transition hover:bg-pitch-700 hover:text-white"
              aria-label={tr.ticketModalClose}
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-bold text-white">{tr.ticketPostShareTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              {recentPost.kind === 'sell' ? tr.ticketPostShareDescSell : tr.ticketPostShareDescBuy}
            </p>
            <div className="mt-4 rounded-lg border border-gray-700/70 bg-pitch-950/70 px-3 py-2 text-xs text-gray-400">
              {buildTicketShareUrl(recentPost)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => void onShareRecentPost()}
                className="rounded-xl bg-gold-500 px-3 py-2.5 text-sm font-bold text-pitch-900 transition hover:bg-gold-400"
              >
                {tr.ticketShare}
              </button>
              <button
                type="button"
                onClick={() => void onCopyRecentPostLink()}
                className="rounded-xl border border-gray-600 bg-pitch-900/70 px-3 py-2.5 text-sm font-semibold text-white transition hover:border-grass-500 hover:text-grass-300"
              >
                {recentPostShareState === 'copied' ? tr.ticketShareCopied : tr.ticketPostShareLink}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="bg-pitch-800 border-t border-grass-700/20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <TicketSafetyDisclaimer tr={tr} />
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-white font-bold">{tr.brand}</span>
            <span className="text-grass-400">· World Cup 2026</span>
            <span className="text-xl">🇧🇷</span>
            <span className="text-xl">🇲🇽</span>
          </div>
          <p className="text-gray-500 text-sm">{tr.footerDesc}</p>
          <p className="mt-3 text-[10px] font-mono text-gray-600 tabular-nums" title="预览模式：改代码后需重新 vite build（如 npm run latest:bg）。此时间不更新说明浏览器仍在用旧构建或旧端口。">
            build · {__OKCOPA_BUILD__}
          </p>
        </div>
      </footer>

      <AuthModal tr={tr} />
      {accountOpen ? (
        <MyAccountModal
          tr={tr}
          wallPosts={userPosts}
          onClose={() => setAccountOpen(false)}
          onDelisted={() => refreshWall()}
        />
      ) : null}
    </div>
  );
}

function ListingCallButton({
  telDigits,
  label,
  disabled,
  onTrack,
}: {
  telDigits: string;
  label: string;
  disabled?: boolean;
  onTrack?: () => void;
}) {
  const layout =
    'flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold';
  if (disabled) {
    return (
      <span
        className={`${layout} cursor-not-allowed border-gray-700/80 bg-pitch-950/50 text-gray-500 opacity-[0.72]`}
        aria-disabled="true"
      >
        <Phone className="h-4 w-4 shrink-0 opacity-45" />
        {label}
      </span>
    );
  }
  return (
    <a
      href={`tel:${telDigits}`}
      onClick={() => onTrack?.()}
      className={`${layout} border-gray-600 bg-pitch-900/70 text-white transition-all duration-200 hover:border-grass-500 hover:text-grass-300`}
    >
      <Phone className="h-4 w-4 shrink-0" />
      {label}
    </a>
  );
}

// ─── High Demand badge ────────────────────────────────────────────────────────

function HighDemandBadge() {
  return (
    <div className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 rounded-md px-2 py-0.5">
      <Flame className="w-3 h-3 text-red-400" />
      <span className="text-[10px] text-red-400 font-bold uppercase tracking-wide">High Demand</span>
    </div>
  );
}

// ─── Rental Card ─────────────────────────────────────────────────────────────

function RentalCard({
  rental,
  highDemand,
  lang,
}: {
  rental: Rental;
  highDemand: boolean;
  lang: Lang;
}) {
  const tr = t[lang];
  const [imgSrc, setImgSrc] = useState(() => rental.imageUrl.trim() || RENTAL_IMAGE_FALLBACK);
  useEffect(() => {
    setImgSrc(rental.imageUrl.trim() || RENTAL_IMAGE_FALLBACK);
  }, [rental.id, rental.imageUrl]);
  const phoneDigits = rental.whatsapp.replace(/\D/g, '');
  /** Only enable call when the listing row has a usable phone (sheet / import). */
  const hasPhone = phoneDigits.length >= 8;
  const amenityIcon = (value: string) => {
    const v = value.toLowerCase();
    if (v.includes('wifi') || v.includes('wi-fi')) return <Zap className="h-3.5 w-3.5 text-grass-400" />;
    if (v.includes('parking')) return <Car className="h-3.5 w-3.5 text-grass-400" />;
    if (v.includes('breakfast')) return <Check className="h-3.5 w-3.5 text-grass-400" />;
    if (v.includes('air')) return <Zap className="h-3.5 w-3.5 text-grass-400" />;
    return <Check className="h-3.5 w-3.5 text-grass-400" />;
  };

  return (
    <div className="group bg-pitch-800 rounded-2xl overflow-hidden border border-gray-700/50 hover:border-grass-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-grass-900/20 hover:-translate-y-0.5">
      <div className="relative h-44 overflow-hidden">
        <img
          src={imgSrc}
          alt={rental.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
          onError={() => setImgSrc((s) => (s === RENTAL_IMAGE_FALLBACK ? s : RENTAL_IMAGE_FALLBACK))}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-pitch-900/80 to-transparent" />
        <div className="absolute top-3 right-3 bg-pitch-900/80 backdrop-blur-sm rounded-lg px-2 py-1 text-xs font-semibold text-gold-400 border border-gold-500/20">
          {rental.pricePerNight > 0 ? (
            <span>{tr.currency}{rental.pricePerNight}{tr.perNight}</span>
          ) : (
            <span className="text-gold-200">{tr.rentalPricePending}</span>
          )}
        </div>
        {highDemand && <div className="absolute top-3 left-3"><HighDemandBadge /></div>}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 text-xs text-gray-300 pr-14">
          <MapPin className="w-3 h-3 text-grass-400" />
          <span className="line-clamp-2">
            {rental.locationDetail ? `${rental.locationDetail} · ${rental.city}` : rental.city}
          </span>
        </div>
        <ListingIdMark id={rental.id} />
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-white text-base mb-1 line-clamp-2">{rental.title}</h4>
        {rental.amenities && rental.amenities.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-300">
            {rental.amenities.slice(0, 4).map(a => (
              <span
                key={a}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-700 bg-pitch-900/70 px-2 py-1"
              >
                {amenityIcon(a)}
                <span className="whitespace-nowrap">{a}</span>
              </span>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-grass-500" />
              <span>{rental.distanceKm} {tr.kmStadium}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5 text-grass-500" />
              <span>{tr.beds(rental.bedrooms)}</span>
            </div>
          </div>
        )}
        <div className="mb-3 text-xs text-gray-500">{tr.host}: {rental.host}</div>
        <ListingCallButton
          telDigits={phoneDigits}
          label={tr.contactPhone}
          disabled={!hasPhone}
          onTrack={() =>
            track(AnalyticsEvent.HotelCall, { rental_id: rental.id, city: rental.city, has_phone: hasPhone })
          }
        />
      </div>
    </div>
  );
}

// ─── Car Card — call uses row `whatsapp` (phone digits); disabled when empty or too short ────

function CarCard({ car, highDemand, lang }: { car: CarRental; highDemand: boolean; lang: Lang }) {
  const tr = t[lang];
  const stadium = stadiumForCarCity(car.city);
  const [imageHidden, setImageHidden] = useState(
    () => car.imageUrl.includes('placeholder.svg') || !car.imageUrl.trim(),
  );
  const phoneDigits = car.whatsapp.replace(/\D/g, '');
  const hasPhone = phoneDigits.length >= 8;

  return (
    <div className="group bg-pitch-800 rounded-2xl overflow-hidden border border-gray-700/50 hover:border-grass-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-grass-900/20 hover:-translate-y-0.5">
      <div className="relative h-44 overflow-hidden bg-pitch-700/90">
        {!imageHidden ? (
          <img
            src={car.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImageHidden(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-pitch-900/80 to-transparent" />
        {highDemand && <div className="absolute top-3 left-3"><HighDemandBadge /></div>}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 text-xs text-gray-300 pr-14">
          <MapPin className="w-3 h-3 shrink-0 text-grass-400" />
          <span className="line-clamp-2">{car.city}</span>
        </div>
        <ListingIdMark id={car.id} />
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-white text-base mb-2 line-clamp-2">{car.provider}</h4>
        {stadium ? (
          <div className="mb-3 flex items-start gap-2 text-xs text-gray-400 leading-snug">
            <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-grass-500" />
            <span className="min-w-0 line-clamp-2">{tr.carStadiumLine(stadium)}</span>
          </div>
        ) : null}
        <ListingCallButton
          telDigits={phoneDigits}
          label={tr.contactPhone}
          disabled={!hasPhone}
          onTrack={() =>
            track(AnalyticsEvent.CarCall, { car_id: car.id, city: car.city, has_phone: hasPhone })
          }
        />
      </div>
    </div>
  );
}

// ─── Odds (illustrative — EN / ES / PT) ───────────────────────────────────────

function formatOddsDecimal(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function OddsPanel({ lang, tr }: { lang: Lang; tr: Translations }) {
  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-4">
      <div className="rounded-2xl border border-cyan-600/25 bg-gradient-to-br from-pitch-800 to-pitch-900 p-6 sm:p-8">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <BarChart3 className="h-7 w-7 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xl font-bold text-white">{tr.oddsTitle}</h4>
            <p className="mt-2 text-sm text-gray-400 leading-relaxed">{tr.oddsSubtitle}</p>
            <p className="mt-3 text-xs text-amber-200/85 leading-relaxed">{tr.oddsDisclaimer}</p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h5 className="text-lg font-bold text-white">{tr.oddsSectionWinner}</h5>
        <div className="overflow-x-auto rounded-xl border border-gray-700/60 bg-pitch-800/50">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-700/80 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-semibold">{tr.oddsColRank}</th>
                <th className="px-4 py-3 font-semibold">{tr.oddsColCountry}</th>
                <th className="px-4 py-3 font-semibold tabular-nums">{tr.oddsColDecimal}</th>
                <th className="px-4 py-3 font-semibold tabular-nums">{tr.oddsColImplied}</th>
              </tr>
            </thead>
            <tbody>
              {outrightWinnerRows.map(row => (
                <tr
                  key={row.rank}
                  className="border-b border-gray-800/80 last:border-0 hover:bg-pitch-900/40"
                >
                  <td className="px-4 py-2.5 font-mono tabular-nums text-gray-400">{row.rank}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-2.5">
                      <span className="text-lg leading-none" aria-hidden>
                        {row.flag}
                      </span>
                      <span className="font-medium text-white">{row.country[lang]}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-gray-200">{formatOddsDecimal(row.decimalOdds)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-grass-300/90">
                    {row.impliedPct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>


      <section className="space-y-3">
        <h5 className="text-lg font-bold text-white">{tr.oddsSectionQualify}</h5>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groupQualifyRows.map(row => (
            <div
              key={row.groupLetter}
              className="overflow-hidden rounded-xl border border-gray-700/60 bg-pitch-800/50"
            >
              <div className="border-b border-gray-700/70 bg-pitch-900/50 px-4 py-2.5 text-sm font-bold text-cyan-200">
                {tr.oddsGroup(row.groupLetter)}
              </div>
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-gray-500 sm:text-xs">
                    <th className="px-3 py-2 font-semibold">{tr.oddsColTeam}</th>
                    <th className="px-3 py-2 font-semibold tabular-nums">{tr.oddsColWinGroup}</th>
                    <th className="px-3 py-2 font-semibold tabular-nums">{tr.oddsColToQualify}</th>
                  </tr>
                </thead>
                <tbody>
                  {row.teams.map((team, i) => (
                    <tr key={`${row.groupLetter}-${i}`} className="border-t border-gray-800/70 hover:bg-pitch-900/35">
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2 font-medium text-white min-w-0">
                          <span className="text-base leading-none shrink-0" aria-hidden>
                            {team.flag}
                          </span>
                          <span className="truncate">{team[lang]}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-gray-200">
                        {formatOddsDecimal(row.winGroupOdds[i])}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-grass-300/90">
                        {formatOddsDecimal(row.qualifyOdds[i])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="col-span-3 py-16 text-center text-gray-500">
      <MapPin className="w-8 h-8 mx-auto mb-3 text-gray-700" />
      <p>{label}</p>
    </div>
  );
}

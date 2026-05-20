import { useState, useRef, useEffect } from 'react';
import {
  MapPin, ChevronLeft, ChevronRight, Bed, Car, Building2,
  Zap, Calendar, MessageCircle, Phone, Clock,
  Flame, ChevronDown, Check, Ticket,
  BarChart3, Tag, Search,
} from 'lucide-react';
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
import { outrightWinnerRows, groupQualifyRows } from './oddsData';
import { useTicketWall, TicketPostModal, TicketPostGrid, HeroBuyTicker } from './TicketMarketplace';
import type { TicketWallKind } from './ticketPosts';

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

const whatsappUrl = (phone: string, message: string) => {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '#';
  // `wa.me` — same as before; digits-only avoids `+`/spaces breaking the URL.
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
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

type Tab = 'tickets' | 'cars' | 'hotels' | 'odds';

type TicketSubTab = 'buy' | 'sell';

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
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('tickets');
  const [ticketSubTab, setTicketSubTab] = useState<TicketSubTab>('sell');
  const [postModal, setPostModal] = useState<TicketWallKind | null>(null);
  const { handlePost, buyPosts, sellPosts } = useTicketWall(lang);
  const [scheduleExpandedDate, setScheduleExpandedDate] = useState<string | null>(() => {
    const dates = [...new Set(matches.map(m => m.date))].sort();
    return dates[0] ?? null;
  });
  const [navSolid, setNavSolid] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [carsExpanded, setCarsExpanded] = useState(false);
  const [hotelsExpanded, setHotelsExpanded] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const hostCitiesRef = useRef<HTMLDivElement>(null);
  const scheduleSectionRef = useRef<HTMLElement>(null);
  const listingsRef = useRef<HTMLElement>(null);
  const tr = t[lang];

  useEffect(() => {
    const handler = () => setNavSolid(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    setCarsExpanded(false);
    setHotelsExpanded(false);
  }, [activeCity]);

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

  const matchesForDate = (date: string) => matches.filter(m => m.date === date);
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

  const filterByCityFromMatch = (city: string) => {
    setActiveCity(prev => (prev === city ? null : city));
    setTimeout(() => listingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex-shrink-0">
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
              {tr.brand} <span className="text-grass-400">· World Cup 2026</span>
            </h1>
            <p className="text-[10px] text-gray-400 tracking-widest uppercase leading-none">{tr.brandSub}</p>
          </div>

          {/* Right: schedule + language (category nav moved to hero) */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <Calendar className="w-3.5 h-3.5 text-gold-400" />
              <span>{tr.scheduleFullRange}</span>
            </div>

            <button
              onClick={() => scheduleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-gray-400 hover:text-white hover:bg-white/5"
            >
              <Calendar className="w-3.5 h-3.5" />
              {lang === 'pt' ? 'Calendário' : lang === 'es' ? 'Calendario' : 'Schedule'}
            </button>

            {/* Language switcher */}
            <div id="lang-menu" className="relative">
              <button
                onClick={() => setLangOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-pitch-700/80 border border-gray-700 hover:border-grass-600/60 text-sm text-gray-300 hover:text-white transition-all duration-200"
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
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
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

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section
        className="relative flex flex-col overflow-hidden bg-pitch-900 py-4 sm:py-6"
        style={{ minHeight: 'min(56vh, 520px)' }}
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

        <div className="relative z-10 mx-auto max-w-7xl flex-1 px-4 pb-4 pt-20 sm:px-6 sm:pb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            <div className="min-w-0 flex-1">
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

              <div className="mb-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setPostModal('sell')}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-3 text-sm font-bold text-pitch-900 shadow-lg shadow-gold-900/35 transition hover:brightness-110 active:scale-[0.98]"
                >
                  <Tag className="h-4 w-4" />
                  {tr.heroCtaSell}
                </button>
                <button
                  type="button"
                  onClick={() => setPostModal('buy')}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-sky-400/60 bg-sky-500/15 px-5 py-3 text-sm font-bold text-sky-100 shadow-lg shadow-black/25 transition hover:border-sky-300 hover:bg-sky-500/25 active:scale-[0.98]"
                >
                  <Search className="h-4 w-4 text-sky-300" />
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

            {/* Category shortcuts — replaces countdown; same vibe as gold CTA */}
            <div className="w-full shrink-0 lg:w-[17.5rem] grid grid-cols-2 gap-2 lg:grid-cols-1">
              {([
                { id: 'tickets', tab: 'tickets' as Tab, label: tr.tabTickets, icon: Ticket, tone: 'gold' as const },
                { id: 'cars', tab: 'cars' as Tab, label: tr.tabCars, icon: Car, tone: 'grass' as const },
                { id: 'hotels', tab: 'hotels' as Tab, label: tr.tabHotels, icon: Building2, tone: 'grass' as const },
                { id: 'odds', tab: 'odds' as Tab, label: tr.tabOdds, icon: BarChart3, tone: 'grass' as const },
              ]).map(({ id, tab, label, icon: Icon, tone }) => {
                const isActive = id === 'tickets' ? activeTab === 'tickets' : activeTab === tab;
                const base =
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-lg transition-all duration-200 active:scale-[0.98]';
                const goldActive = 'bg-gradient-to-r from-gold-500 to-gold-600 text-pitch-900 shadow-gold-900/35';
                const goldIdle =
                  'border-2 border-gold-500/55 bg-pitch-900/70 text-gold-100 shadow-black/30 hover:border-gold-400 hover:bg-gold-500/10';
                const grassActive = 'bg-grass-600 text-white shadow-grass-900/40';
                const grassIdle =
                  'border border-gray-600/80 bg-pitch-900/70 text-gray-200 shadow-black/20 hover:border-grass-500/50 hover:text-white';
                const cls =
                  tone === 'gold'
                    ? `${base} ${isActive ? goldActive : goldIdle}`
                    : `${base} ${isActive ? grassActive : grassIdle}`;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      setTimeout(() => listingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                    }}
                    className={cls}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-90" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <HeroBuyTicker posts={buyPosts} tr={tr} />
      </section>

      {/* ── SCHEDULE (cards: blue = group, amber = knockout) ─────────────── */}
      <section
        id="schedule"
        ref={scheduleSectionRef}
        className="scroll-mt-[72px] border-y border-grass-700/20 bg-pitch-800/60 py-8 sm:py-10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <Calendar className="h-6 w-6 shrink-0 text-emerald-400 sm:h-7 sm:w-7" />
                <h3 className="text-xl font-extrabold uppercase tracking-[0.12em] text-white sm:text-2xl">
                  {tr.scheduleTitle}
                </h3>
                {scheduleExpandedDate && (
                  <span className="rounded-full border border-emerald-600/45 bg-emerald-950/55 px-2.5 py-1 text-xs font-bold text-emerald-300 sm:text-sm sm:px-3">
                    {formatSchedulePill(scheduleExpandedDate)}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-gray-500 sm:text-sm">
                {tr.scheduleFullRange}
                {import.meta.env.DEV && (
                  <span className="ml-1 text-cyan-500/90">· grid UI</span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => scroll('left')}
                className="rounded-lg border border-gray-700/80 bg-pitch-950/90 p-2 text-gray-400 transition hover:border-gray-600 hover:text-white sm:p-2.5"
                aria-label="Scroll schedule left"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                className="rounded-lg border border-gray-700/80 bg-pitch-950/90 p-2 text-gray-400 transition hover:border-gray-600 hover:text-white sm:p-2.5"
                aria-label="Scroll schedule right"
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          </div>

          <div ref={scheduleRef} className="scrollbar-hide flex gap-2 overflow-x-auto pb-2 pt-1 snap-x snap-mandatory sm:gap-2.5">
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
                  ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-pitch-800'
                  : 'ring-2 ring-amber-400 ring-offset-2 ring-offset-pitch-800'
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
                  onClick={() => setScheduleExpandedDate(date)}
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
                        onClick={() => filterByCityFromMatch(m.city)}
                        className={`rounded-xl border bg-pitch-950/90 p-3 text-left transition hover:bg-pitch-900 sm:p-4 ${
                          isG
                            ? 'border-cyan-600/40 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.06)]'
                            : 'border-amber-600/45 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.07)]'
                        } ${activeCity === m.city ? 'ring-2 ring-gold-400/80' : ''}`}
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
      </section>

      {/* ── HOST CITIES ─────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-2xl font-bold text-white">{tr.citiesTitle}</h3>
              <p className="text-gray-400 text-sm mt-1">{tr.citiesDesc}</p>
            </div>
            <div className="flex items-center gap-2 self-start shrink-0">
              <button
                type="button"
                onClick={() => scrollHostCities('left')}
                className="p-2 rounded-lg bg-pitch-700 border border-gray-700 hover:border-grass-600 text-gray-400 hover:text-grass-400 transition-colors"
                aria-label="Scroll cities left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollHostCities('right')}
                className="p-2 rounded-lg bg-pitch-700 border border-gray-700 hover:border-grass-600 text-gray-400 hover:text-grass-400 transition-colors"
                aria-label="Scroll cities right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[11px] text-gray-500">
              {lang === 'es'
                ? 'Desliza horizontalmente para ver más ciudades.'
                : lang === 'pt'
                ? 'Deslize horizontalmente para ver mais cidades.'
                : 'Swipe left/right to view more cities.'}
            </p>
            {activeCity && (
              <button
                type="button"
                onClick={() => setActiveCity(null)}
                className="text-sm text-grass-400 hover:text-grass-300 border border-grass-600/40 hover:border-grass-500 rounded-lg px-3 py-1.5 transition-colors"
              >
                {tr.clearFilter}
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-pitch-900 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-pitch-900 to-transparent z-10" />
        <div ref={hostCitiesRef} className="overflow-x-auto pb-2">
          <div className="grid min-w-max grid-flow-col grid-rows-2 auto-cols-[7.5rem] gap-2 sm:auto-cols-[8.5rem] sm:gap-3">
            {cities.map(city => {
              const isActive = activeCity === city.name;
              const isHighDemand = highDemandCities.has(city.name);
              return (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => {
                    setActiveCity(isActive ? null : city.name);
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
      </section>

      {/* ── LISTINGS ──────────────────────────────────────────────────── */}
      <section ref={listingsRef} className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h3 className="text-2xl font-bold text-white">
            {activeCity ? (
              <>
                <span className="text-grass-400">{tr.listingsFilteredCity(activeCity)}</span>
                <span className="text-gray-400 text-base font-normal ml-2">{tr.listingsSuffix}</span>
              </>
            ) : tr.listingsTitle}
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            {activeCity && (
              <button
                type="button"
                onClick={() => setActiveCity(null)}
                className="text-sm text-grass-400 hover:text-grass-300 border border-grass-600/40 hover:border-grass-500 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
              >
                {tr.clearFilter}
              </button>
            )}
            {activeCity && highDemandCities.has(activeCity) && (
              <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5">
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-400 font-semibold">{tr.highDemand}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="sticky top-[56px] z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-pitch-900/95 backdrop-blur-xl border-b border-gray-800/60 mb-6">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 bg-pitch-800 rounded-xl p-1 w-full border border-gray-700/50">
            {([
              {
                key: 'tickets' as Tab,
                label: tr.tabTickets,
                icon: Ticket,
                count: buyPosts.length + sellPosts.length,
                activeCls: 'bg-gradient-to-r from-gold-500 to-gold-600 text-pitch-900 shadow-lg shadow-gold-900/35',
                badgeCls: 'bg-pitch-900/20 text-pitch-900',
              },
              { key: 'cars' as Tab, label: tr.tabCars, icon: Car, count: filteredCars.length, activeCls: 'bg-grass-600 text-white shadow-lg shadow-grass-900/40', badgeCls: 'bg-grass-500/50 text-white' },
              { key: 'hotels' as Tab, label: tr.tabHotels, icon: Building2, count: filteredHotels.length, activeCls: 'bg-grass-600 text-white shadow-lg shadow-grass-900/40', badgeCls: 'bg-grass-500/50 text-white' },
              { key: 'odds' as Tab, label: tr.tabOdds, icon: BarChart3, activeCls: 'bg-grass-600 text-white shadow-lg shadow-grass-900/40', badgeCls: 'bg-grass-500/50 text-white' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 min-w-0 ${
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
            <div className="mb-5 flex rounded-xl border border-gray-700/60 bg-pitch-800/90 p-1">
              <button
                type="button"
                onClick={() => setTicketSubTab('sell')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                  ticketSubTab === 'sell'
                    ? 'bg-gold-500 text-pitch-900 shadow-md shadow-gold-900/25'
                    : 'text-gray-400 hover:bg-pitch-700/80 hover:text-gold-200'
                }`}
              >
                <Tag className="h-4 w-4 shrink-0" />
                {tr.tabTicketSell}
                <span className="rounded-full bg-pitch-900/15 px-1.5 py-px text-[10px] font-mono tabular-nums">
                  {sellPosts.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTicketSubTab('buy')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${
                  ticketSubTab === 'buy'
                    ? 'bg-sky-500 text-pitch-950 shadow-md shadow-sky-900/30'
                    : 'text-gray-400 hover:bg-pitch-700/80 hover:text-sky-200'
                }`}
              >
                <Search className="h-4 w-4 shrink-0" />
                {tr.tabTicketBuy}
                <span className="rounded-full bg-pitch-950/20 px-1.5 py-px text-[10px] font-mono tabular-nums">{buyPosts.length}</span>
              </button>
            </div>

            {ticketSubTab === 'buy' ? (
              <TicketPostGrid kind="buy" posts={buyPosts} tr={tr} lang={lang} />
            ) : (
              <TicketPostGrid kind="sell" posts={sellPosts} tr={tr} lang={lang} activeCity={activeCity} />
            )}
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
                  onClick={() => setHotelsExpanded(true)}
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
                  onClick={() => setCarsExpanded(true)}
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

      {postModal ? (
        <TicketPostModal
          kind={postModal}
          lang={lang}
          tr={tr}
          onClose={() => setPostModal(null)}
          onSubmit={post => {
            handlePost(post);
            setActiveTab('tickets');
            setTicketSubTab(post.kind === 'buy' ? 'buy' : 'sell');
          }}
        />
      ) : null}

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="bg-pitch-800 border-t border-grass-700/20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
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
    </div>
  );
}

// ─── WhatsApp button ──────────────────────────────────────────────────────────

function WhatsAppButton({ href, label, disabled }: { href: string; label: string; disabled?: boolean }) {
  const layout =
    'relative flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-bold overflow-hidden';
  if (disabled) {
    return (
      <span
        className={`${layout} cursor-not-allowed border border-gray-600/70 bg-pitch-900/85 text-gray-500 opacity-[0.72]`}
        aria-disabled="true"
      >
        <MessageCircle className="h-4 w-4 shrink-0 opacity-45" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${layout} group text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]`}
      style={{ backgroundColor: '#00CF15' }}
    >
      <span className="relative flex-shrink-0">
        <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" style={{ animationDuration: '2s' }} />
        <MessageCircle className="relative h-4 w-4" />
      </span>
      <span>{label}</span>
    </a>
  );
}

function ListingCallButton({
  telDigits,
  label,
  disabled,
}: {
  telDigits: string;
  label: string;
  disabled?: boolean;
}) {
  const layout =
    'mt-2 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold';
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
  const msg = lang === 'es'
    ? `¡Hola! Vi tu anuncio "${rental.title}" en OKcopa WC2026. ¿Está disponible?`
    : lang === 'pt'
    ? `Olá! Vi sua hospedagem "${rental.title}" no OKcopa Copa 2026. Está disponível?`
    : `Hi! I found your listing "${rental.title}" on OKcopa WC2026. Is it available?`;
  const waDigits = rental.whatsapp.replace(/\D/g, '');
  /** Same rule as car cards: only link to the number from the listing row (sheet / import). */
  const hasRowWhatsapp = waDigits.length >= 8;
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
        <WhatsAppButton
          href={hasRowWhatsapp ? whatsappUrl(rental.whatsapp, msg) : ''}
          label={tr.contactWhatsApp}
          disabled={!hasRowWhatsapp}
        />
        <ListingCallButton telDigits={waDigits} label={tr.contactPhone} disabled={!hasRowWhatsapp} />
      </div>
    </div>
  );
}

// ─── Car Card — WhatsApp / call use row `whatsapp`; both disabled (gray) when empty or too short ────

function CarCard({ car, highDemand, lang }: { car: CarRental; highDemand: boolean; lang: Lang }) {
  const tr = t[lang];
  const stadium = stadiumForCarCity(car.city);
  const [imageHidden, setImageHidden] = useState(
    () => car.imageUrl.includes('placeholder.svg') || !car.imageUrl.trim(),
  );
  const msg =
    lang === 'es'
      ? `¡Hola! Vi el alquiler de "${car.provider}" en OKcopa WC2026. ¿Está disponible?`
      : lang === 'pt'
        ? `Olá! Vi o aluguel da "${car.provider}" no OKcopa Copa 2026. Está disponível?`
        : `Hi! I found "${car.provider}" car rental on OKcopa WC2026. Is it available?`;
  const waDigits = car.whatsapp.replace(/\D/g, '');
  const hasRowWhatsapp = waDigits.length >= 8;

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
        <WhatsAppButton
          href={hasRowWhatsapp ? whatsappUrl(car.whatsapp, msg) : ''}
          label={tr.contactWhatsApp}
          disabled={!hasRowWhatsapp}
        />
        <ListingCallButton telDigits={waDigits} label={tr.contactPhone} disabled={!hasRowWhatsapp} />
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

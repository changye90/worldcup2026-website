export interface CrawlerPageMeta {
  title: string;
  description: string;
}

const EN: Record<string, CrawlerPageMeta> = {
  '/': {
    title: 'OKcopa · World Cup 2026 Tickets, Stays & Trip Planning',
    description:
      'Free fan-to-fan World Cup 2026 ticket wall, host-city stays, car hire, and ticket buying guides — contact sellers on WhatsApp.',
  },
  '/tickets': {
    title: 'World Cup 2026 Tickets for Sale · Fan-to-Fan · OKcopa',
    description:
      'Browse live fan ticket listings for FIFA World Cup 2026. Filter by host city and message sellers on WhatsApp.',
  },
  '/wanted': {
    title: 'World Cup 2026 Ticket Requests · Fans Looking to Buy · OKcopa',
    description:
      'See who is looking for FIFA World Cup 2026 tickets by match and city. Post a buy request on OKcopa.',
  },
  '/cars': {
    title: 'World Cup 2026 Car Hire Near Stadiums · OKcopa',
    description: 'Car rental listings near World Cup 2026 host cities and stadiums.',
  },
  '/hotels': {
    title: 'World Cup 2026 Stays Near Host Cities · OKcopa',
    description: 'Homestays and lodging near FIFA World Cup 2026 host cities.',
  },
  '/odds': {
    title: 'World Cup 2026 Odds Overview · OKcopa',
    description: 'Illustrative World Cup 2026 odds — informational only.',
  },
  '/guides': {
    title: 'World Cup 2026 Ticket Buying Guide & Price Trends · OKcopa',
    description:
      'Ticket buying strategy, price trends, safety tips, and how to use OKcopa fan-to-fan listings.',
  },
};

const TAB_TO_PATH: Record<string, string> = {
  tickets: '/tickets',
  wanted: '/wanted',
  cars: '/cars',
  hotels: '/hotels',
  odds: '/odds',
};

function normalizePath(pathname: string): string {
  const p = pathname.replace(/\/$/, '') || '/';
  return p === '/index.html' ? '/' : p;
}

export function crawlerMetaForRequest(pathname: string, tabQuery: string | null): CrawlerPageMeta {
  const path = normalizePath(pathname);
  if (path === '/' && tabQuery && tabQuery in TAB_TO_PATH) {
    return EN[TAB_TO_PATH[tabQuery]] ?? EN['/'];
  }
  return EN[path] ?? EN['/tickets'];
}

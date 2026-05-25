import { BookOpen, TrendingUp, Users, MapPin, ShieldCheck } from 'lucide-react';
import type { Lang } from './i18n';
import { getTicketSeoGuides, type SeoGuideModule } from './ticketSeoGuides';

const MODULE_ICONS: Record<string, typeof BookOpen> = {
  'buy-strategy': BookOpen,
  'price-trends': TrendingUp,
  'fan-market': Users,
  'use-okcopa': MapPin,
  safety: ShieldCheck,
};

function GuideArticle({ module: mod }: { module: SeoGuideModule }) {
  const Icon = MODULE_ICONS[mod.id] ?? BookOpen;
  return (
    <article
      id={mod.id}
      className="scroll-mt-28 rounded-2xl border border-gray-700/45 bg-pitch-800/70 p-5 sm:p-6"
    >
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-500/25 bg-gold-500/10">
          <Icon className="h-5 w-5 text-gold-300" aria-hidden />
        </span>
        <h3 className="pt-1 text-lg font-bold leading-snug text-white sm:text-xl">{mod.title}</h3>
      </header>
      <div className="space-y-3 text-sm leading-relaxed text-gray-300 sm:text-[15px]">
        {mod.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {mod.bullets?.length ? (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-400 sm:text-[15px]">
          {mod.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

/** Crawlable editorial blocks for ticket SEO (always in DOM). */
export function TicketSeoGuides({ lang }: { lang: Lang }) {
  const content = getTicketSeoGuides(lang);

  return (
    <section
      id="ticket-guides"
      aria-labelledby="ticket-guides-heading"
      className="border-t border-gray-800/60 bg-pitch-900/50 py-14 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <header className="mx-auto mb-10 max-w-3xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold-400/90">
            OKcopa · FIFA World Cup 2026
          </p>
          <h2 id="ticket-guides-heading" className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {content.heading}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-gray-400 sm:text-base">{content.intro}</p>
        </header>

        <nav
          aria-label="Guide topics"
          className="mb-8 flex flex-wrap justify-center gap-2"
        >
          {content.modules.map(m => (
            <a
              key={m.id}
              href={`#${m.id}`}
              className="rounded-full border border-gray-600/60 bg-pitch-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:border-gold-500/40 hover:text-gold-200"
            >
              {m.title}
            </a>
          ))}
        </nav>

        <div className="grid gap-6 lg:grid-cols-2">
          {content.modules.map(mod => (
            <GuideArticle key={mod.id} module={mod} />
          ))}
        </div>
      </div>
    </section>
  );
}

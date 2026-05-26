import { useEffect, useState } from 'react';
import type { Translations } from './i18n';

/** Match 1 kickoff — Jun 11, 2026, 13:00 America/Mexico_City (UTC−6). */
const KICKOFF_MS = Date.UTC(2026, 5, 11, 19, 0, 0);

function getRemaining() {
  const diff = Math.max(0, KICKOFF_MS - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    mins: Math.floor((diff % 3_600_000) / 60_000),
    secs: Math.floor((diff % 60_000) / 1000),
  };
}

export function HeroCountdown({ tr }: { tr: Translations }) {
  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    const id = window.setInterval(() => setRemaining(getRemaining()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const units = [
    { label: tr.countdownDays, value: remaining.days },
    { label: tr.countdownHours, value: remaining.hours },
    { label: tr.countdownMins, value: remaining.mins },
    { label: tr.countdownSecs, value: remaining.secs },
  ];

  return (
    <div className="rounded-2xl border border-gold-500/30 bg-pitch-950/85 p-4 shadow-xl shadow-black/30 backdrop-blur-md sm:p-5">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-gold-400 sm:text-xs">
        {tr.countdownLabel}
      </p>
      <p className="mt-1 text-center text-[11px] leading-snug text-gray-500">{tr.countdownEvent}</p>
      <div className="mt-4 grid grid-cols-4 gap-1.5 sm:gap-2">
        {units.map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center rounded-xl border border-gray-700/60 bg-pitch-900/90 px-1 py-2.5 sm:py-3"
          >
            <span className="text-xl font-extrabold tabular-nums leading-none text-white sm:text-2xl">
              {String(value).padStart(2, '0')}
            </span>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-gray-500 sm:text-[10px]">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

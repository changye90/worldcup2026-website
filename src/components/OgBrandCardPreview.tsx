/**
 * Dev/preview: HTML + Tailwind mirror of functions/ogBrandSvg.ts (1200×630).
 * Not used in production OG — Workers render SVG → PNG at /og/brand.
 */
const WA_GREEN = '#25D366';
const BRAND_ORANGE = '#FF7A1A';

export function OgBrandCardPreview() {
  return (
    <div
      className="relative mx-auto overflow-hidden rounded-2xl shadow-2xl"
      style={{ width: 1200, height: 630, maxWidth: '100%', aspectRatio: '1200/630' }}
      aria-label="OKcopa Open Graph card preview"
    >
      <img
        src="/hero.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/48 to-black/58"
        aria-hidden
      />

      <div className="relative flex h-full flex-col px-16 py-12">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <span
            className="font-extrabold tracking-[0.2em] text-[56px] leading-none"
            style={{ color: BRAND_ORANGE }}
          >
            OKCOPA
          </span>
          <span
            className="rounded-full px-6 py-3 text-[22px] font-extrabold text-white"
            style={{ backgroundColor: WA_GREEN }}
          >
            100% FREE
          </span>
        </div>

        <div className="mt-10 max-w-[920px] flex-1">
          <h1 className="text-[58px] font-extrabold leading-[1.05] tracking-tight text-white">
            FAN-TO-FAN TICKET HUB
          </h1>
          <p className="mt-3 text-[40px] font-bold text-amber-400">100% FREE MARKETPLACE</p>
          <div
            className="mt-5 h-1.5 w-[120px] rounded-full"
            style={{ backgroundColor: BRAND_ORANGE }}
          />
          <p className="mt-6 text-[26px] font-medium text-gray-200">
            Fan listings · No platform fees · Built for World Cup 2026
          </p>
        </div>

        <div className="shrink-0 space-y-3">
          <div
            className="flex items-center gap-5 rounded-[18px] px-7 py-5"
            style={{ background: `linear-gradient(90deg, #1EBE5A, ${WA_GREEN})` }}
          >
            <svg
              className="h-[52px] w-[52px] shrink-0 text-white"
              viewBox="0 0 48 48"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M24 4C13.507 4 5 12.507 5 23c0 3.86 1.01 7.48 2.78 10.62L5 43l9.58-2.51A18.93 18.93 0 0024 42c10.493 0 19-8.507 19-19S34.493 4 24 4zm-1.17 24.77c-5.47 0-9.92-4.45-9.92-9.92 0-5.47 4.45-9.92 9.92-9.92 5.47 0 9.92 4.45 9.92 9.92 0 2.58-1 4.93-2.63 6.68l.98 3.58-3.67-.96a9.82 9.82 0 01-5.6 1.74zm5.2-7.01c.3-.48-.19-.88-.48-1.17l-1.9-1.74c-.24-.22-.62-.24-.88-.05l-2.26 1.58c-.44.31-1.04.22-1.38-.2l-3.4-3.92c-.34-.42-.28-1.04.14-1.38l2.1-1.72c.26-.22.32-.6.14-.88l-1.44-2.24c-.28-.44-.9-.52-1.3-.18l-2.68 2.22c-.5.42-1.22.36-1.64-.14-1.12-1.28-2.9-3.42-2.9-5.5 0-3.72 3.02-6.74 6.74-6.74 3.1 0 5.78 2.02 6.68 4.86.9 2.84-.38 5.92-2.96 7.38z"
              />
            </svg>
            <p className="text-[34px] font-extrabold leading-tight text-white">
              DIRECT WHATSAPP CHAT WITH SELLERS
            </p>
          </div>
          <p className="text-[24px] font-semibold text-gray-300">
            Skip the 30% StubHub fees. Save money together.
          </p>
        </div>
      </div>
    </div>
  );
}

import teamFlagsData from './data/team-flags.json';

const WHITE_FLAG = '🏳️';
const teams = teamFlagsData.teams as Record<string, string>;
const countries = teamFlagsData.countries as Record<string, string>;

export function flagForTeam(name: string): string {
  const t = name.trim();
  if (!t) return WHITE_FLAG;
  if (teams[t]) return teams[t];
  if (/^\d|^[123][A-L]\b|^W\d+|^L\d+|^3[A-L/.]/i.test(t)) return '⚽';
  return WHITE_FLAG;
}

export function flagForCountry(country: string): string {
  const key = country.trim().toLowerCase();
  if (!key) return WHITE_FLAG;
  for (const [k, flag] of Object.entries(countries)) {
    if (key.includes(k)) return flag;
  }
  return WHITE_FLAG;
}

export function isPlaceholderFlag(flag: string | null | undefined): boolean {
  const f = flag?.trim();
  return !f || f === WHITE_FLAG;
}

export function resolveTicketPostFlag(
  post: {
    kind: 'buy' | 'sell';
    flag?: string | null;
    payload?: Record<string, unknown> | null;
  },
  matchFlags?: { flag1?: string; flag2?: string } | null,
): string {
  if (matchFlags?.flag1 && matchFlags?.flag2) return `${matchFlags.flag1}${matchFlags.flag2}`;
  if (matchFlags?.flag1) return matchFlags.flag1;
  if (!isPlaceholderFlag(post.flag)) return post.flag!.trim();
  const p = post.payload;
  if (p && typeof p === 'object') {
    const country = typeof p.country === 'string' ? p.country : '';
    if (country) {
      const cf = flagForCountry(country);
      if (!isPlaceholderFlag(cf)) return cf;
    }
  }
  return post.flag?.trim() || WHITE_FLAG;
}

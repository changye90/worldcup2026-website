/** Map flag emoji → flagcdn.com slug (e.g. nz, gb-sct). */
const SPECIAL: Record<string, string> = {
  '🏴󠁧󠁢󠁳󠁣󠁴󠁿': 'gb-sct',
  '🏴󠁧󠁢󠁥󠁮󠁧󠁿': 'gb-eng',
};

export function flagEmojiToIso(flag: string): string | null {
  const f = flag.trim();
  if (!f || f === '⚽' || f === '🏳️' || f === '🏳') return null;
  if (SPECIAL[f]) return SPECIAL[f];
  const chars = [...f];
  const a = chars[0]?.codePointAt(0);
  const b = chars[1]?.codePointAt(0);
  if (
    a != null &&
    b != null &&
    a >= 0x1f1e6 &&
    a <= 0x1f1ff &&
    b >= 0x1f1e6 &&
    b <= 0x1f1ff
  ) {
    return (
      String.fromCharCode(a - 0x1f1e6 + 0x41) + String.fromCharCode(b - 0x1f1e6 + 0x41)
    ).toLowerCase();
  }
  return null;
}

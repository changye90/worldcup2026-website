export type TicketDetailEntrySource = 'share_link' | 'internal' | 'referral' | 'direct';

const ENTRY_FLAG_KEY = 'okcopa-ticket-entry';

/** Mark next detail view as in-app navigation (wall → detail). */
export function markTicketDetailInternalEntry(): void {
  try {
    sessionStorage.setItem(ENTRY_FLAG_KEY, 'internal');
  } catch {
    /* ignore */
  }
}

/** Read how the user landed on a ticket detail page (once per load). */
export function readTicketDetailEntrySource(
  url: URL = new URL(window.location.href),
): TicketDetailEntrySource {
  if (url.searchParams.get('ref') === 'share') return 'share_link';

  try {
    const flag = sessionStorage.getItem(ENTRY_FLAG_KEY);
    if (flag === 'internal') {
      sessionStorage.removeItem(ENTRY_FLAG_KEY);
      return 'internal';
    }
  } catch {
    /* ignore */
  }

  const ref = typeof document !== 'undefined' ? document.referrer : '';
  if (ref?.trim()) {
    try {
      const host = new URL(ref).hostname.replace(/^www\./i, '').toLowerCase();
      if (!host.includes('okcopa') && !/^(localhost|127\.)/i.test(host)) {
        return 'referral';
      }
    } catch {
      return 'referral';
    }
  }

  return 'direct';
}

/** Strip ?ref=share after attribution is recorded (keeps canonical /tickets/{id}). */
export function stripTicketShareRefParam(url: URL = new URL(window.location.href)): boolean {
  if (url.searchParams.get('ref') !== 'share') return false;
  url.searchParams.delete('ref');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, '', next);
  return true;
}

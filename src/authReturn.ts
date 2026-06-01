/** Remember where to return after email verification (survives redirect to inbox). */

const RETURN_KEY = 'okcopa-auth-return';
const SELL_GUARANTEE_KEY = 'okcopa-sell-guarantee-pending';

export interface AuthReturnIntent {
  openSellModal: boolean;
  platformGuarantee: boolean;
}

export function saveAuthReturnIntent(intent: Partial<AuthReturnIntent>): void {
  const payload: AuthReturnIntent = {
    openSellModal: intent.openSellModal ?? true,
    platformGuarantee: intent.platformGuarantee ?? true,
  };
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function peekAuthReturnIntent(): AuthReturnIntent | null {
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as AuthReturnIntent;
    if (!p?.openSellModal) return null;
    return {
      openSellModal: true,
      platformGuarantee: Boolean(p.platformGuarantee),
    };
  } catch {
    return null;
  }
}

export function consumeAuthReturnIntent(): AuthReturnIntent | null {
  const intent = peekAuthReturnIntent();
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* ignore */
  }
  return intent;
}

export function markSellGuaranteePending(): void {
  try {
    sessionStorage.setItem(SELL_GUARANTEE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function consumeSellGuaranteePending(): boolean {
  try {
    const v = sessionStorage.getItem(SELL_GUARANTEE_KEY) === '1';
    sessionStorage.removeItem(SELL_GUARANTEE_KEY);
    return v;
  } catch {
    return false;
  }
}

export const AUTH_RETURN_SELL_GUARANTEE = 'sell-guarantee';

// Granular cookie/storage consent manager.
// Categories follow the standard CMP taxonomy.
// "necessary" is always granted (banner consent record, auth session, theme/lang preferences live here).

export type ConsentCategory = 'necessary' | 'preferences' | 'statistics' | 'marketing';

export interface ConsentState {
  necessary: true;
  preferences: boolean;
  statistics: boolean;
  marketing: boolean;
  /** ISO timestamp of when the user made the choice */
  timestamp: string;
  /** Schema version — bump to re-prompt all users when categories change */
  version: number;
}

const STORAGE_KEY = 'cookie-consent-v2';
export const CONSENT_VERSION = 1;
export const CONSENT_CHANGE_EVENT = 'cookie-consent-change';
export const OPEN_SETTINGS_EVENT = 'cookie-consent-open';

export function getConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setConsent(partial: Partial<Omit<ConsentState, 'necessary' | 'timestamp' | 'version'>>): ConsentState {
  const state: ConsentState = {
    necessary: true,
    preferences: !!partial.preferences,
    statistics: !!partial.statistics,
    marketing: !!partial.marketing,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_CHANGE_EVENT, { detail: state }));
  }
  return state;
}

export function hasConsent(category: ConsentCategory): boolean {
  if (category === 'necessary') return true;
  const state = getConsent();
  return !!state?.[category];
}

export function openCookieSettings() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
  }
}

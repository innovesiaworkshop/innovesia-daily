// ─────────────────────────────────────────────
//  Theme config type — one file per client
// ─────────────────────────────────────────────

export interface ClientTheme {
  /** Short ID used in env vars, e.g. "innovesia" or "acme" */
  clientId: string;

  /** Full company name shown in the app */
  companyName: string;

  /** Short name for PWA home screen / manifest */
  companyShortName: string;

  /** App title shown in the header and browser tab */
  appName: string;

  /** App subtitle / tagline (optional) */
  appTagline?: string;

  /** Optional per-client brand title. If omitted, the login hero falls back to `appName`
      and the in-app header to `companyShortName`/`appName` in a clean single style. */
  branding?: {
    /** Two-tone wordmark: bold lead + italic accent (e.g. "Innovesia" + "daily"). When set,
        it's used for both the login hero and the header unless a specific title overrides it. */
    wordmark?: { lead: string; accent: string };
    /** Full title for the login hero. Falls back to `wordmark`, then `appName`. */
    loginTitle?: string;
    /** Compact title for the in-app header. Falls back to `wordmark`, then `companyShortName`. */
    headerTitle?: string;
  };

  /** Brand colors */
  colors: {
    primary: string;   // main buttons, headers, active states
    accent: string;    // links, secondary actions
    highlight: string; // badges, "needs action" indicators
    background: string;
    surface: string;   // cards, panels
    text: string;
    textMuted: string;
  };

  /** Logo paths (relative to /public) */
  assets: {
    logo: string;          // e.g. "/logo.png"
    logoMark: string;      // small square icon, e.g. "/logo-mark.png"
    favicon: string;       // e.g. "/favicon.ico"
    pwaIcon192: string;    // e.g. "/icons/icon-192.png"
    pwaIcon512: string;    // e.g. "/icons/icon-512.png"
    loginBackground: string; // full-bleed login photo, e.g. "/login-background.png"
    appBackground: string;   // app canvas behind the glass, e.g. "/app-background.png"
  };

  /** PWA manifest fields */
  pwa: {
    themeColor: string;     // usually same as colors.primary
    backgroundColor: string;
  };

  /** Contact/support info shown in the app */
  support?: {
    email?: string;
    whatsapp?: string;
  };
}

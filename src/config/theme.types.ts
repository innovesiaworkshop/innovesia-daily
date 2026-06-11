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

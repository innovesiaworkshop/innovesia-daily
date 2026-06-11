// ─────────────────────────────────────────────
//  Brand title resolution
//  Turns a client theme's optional `branding` config into a render-ready shape for the
//  login hero and the in-app header. A client may define a two-tone `wordmark`, explicit
//  per-surface titles, or nothing at all — each surface falls back to a clean single style.
// ─────────────────────────────────────────────

import type { ClientTheme } from "./theme.types";

/** Either a two-tone wordmark (bold lead + italic accent) or a single clean title. */
export type BrandTitle =
  | { kind: "wordmark"; lead: string; accent: string }
  | { kind: "single"; text: string };

/** Login hero: explicit loginTitle → wordmark → appName. */
export function loginBranding(theme: ClientTheme): BrandTitle {
  const b = theme.branding;
  if (b?.loginTitle) return { kind: "single", text: b.loginTitle };
  if (b?.wordmark) return { kind: "wordmark", ...b.wordmark };
  return { kind: "single", text: theme.appName };
}

/** In-app header: explicit headerTitle → wordmark → companyShortName (then appName). */
export function headerBranding(theme: ClientTheme): BrandTitle {
  const b = theme.branding;
  if (b?.headerTitle) return { kind: "single", text: b.headerTitle };
  if (b?.wordmark) return { kind: "wordmark", ...b.wordmark };
  return { kind: "single", text: theme.companyShortName || theme.appName };
}

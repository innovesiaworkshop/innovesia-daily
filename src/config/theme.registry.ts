// ─────────────────────────────────────────────
//  Theme Registry
//  Maps clientId → theme config
//  To add a new client: import their theme and add to the registry below
// ─────────────────────────────────────────────

import type { ClientTheme } from "./theme.types";
import { innovesiaTheme } from "./clients/innovesia";
// import { acmeTheme } from "./clients/acme"; // ← uncomment when adding Acme

const registry: Record<string, ClientTheme> = {
  innovesia: innovesiaTheme,
  // acme: acmeTheme, // ← uncomment when adding Acme
};

/**
 * Returns the theme for the current client.
 * Client is set via VITE_CLIENT_ID in .env.local
 * Falls back to "innovesia" if not set.
 */
export function getTheme(): ClientTheme {
  const clientId = import.meta.env.VITE_CLIENT_ID ?? "innovesia";
  const theme = registry[clientId];

  if (!theme) {
    console.warn(
      `[Theme] No theme found for client "${clientId}". Falling back to "innovesia".`
    );
    return innovesiaTheme;
  }

  return theme;
}

/** Convenience export — use this everywhere in the app */
export const theme = getTheme();

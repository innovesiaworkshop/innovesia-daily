// ─────────────────────────────────────────────
//  Client: Acme Corp  ← TEMPLATE — duplicate this for every new client
//  Instructions:
//    1. Copy this file, rename it to <clientId>.ts
//    2. Fill in every field below
//    3. Add matching logo files to /public/clients/<clientId>/
//    4. Create a new Supabase project and add env vars in .env.local
//    5. Register in src/config/theme.registry.ts
// ─────────────────────────────────────────────

import type { ClientTheme } from "../theme.types";

export const acmeTheme: ClientTheme = {
  clientId: "acme",
  companyName: "Acme Corp",
  companyShortName: "Acme",
  appName: "Acme Daily",
  appTagline: "Track. Deliver. Grow.",

  colors: {
    primary: "#0d47a1",    // ← replace with client's primary brand color
    accent: "#1976d2",     // ← replace with client's accent color
    highlight: "#ffc107",  // ← replace with client's highlight color
    background: "#f5f7fa",
    surface: "#ffffff",
    text: "#111827",
    textMuted: "#6b7280",
  },

  assets: {
    logo: "/clients/acme/logo.png",
    logoMark: "/clients/acme/logo-mark.png",
    favicon: "/clients/acme/favicon.ico",
    pwaIcon192: "/clients/acme/icons/icon-192.png",
    pwaIcon512: "/clients/acme/icons/icon-512.png",
  },

  pwa: {
    themeColor: "#0d47a1",
    backgroundColor: "#f5f7fa",
  },

  support: {
    email: "support@acme.com",
    whatsapp: "+62xxxxxxxxxx",
  },
};

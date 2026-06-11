// ─────────────────────────────────────────────
//  Client: Innovesia (PT Investasi Inovasi Indonesia)
// ─────────────────────────────────────────────

import type { ClientTheme } from "../theme.types";

export const innovesiaTheme: ClientTheme = {
  clientId: "innovesia",
  companyName: "Innovesia",
  companyShortName: "Innovesia",
  appName: "Innovesia Daily",
  appTagline: "Catat. Lacak. Selesaikan.",

  colors: {
    primary: "#1f52a5",    // navy
    accent: "#14b4e8",     // sky
    highlight: "#ffce0f",  // gold
    background: "#f5f7fa",
    surface: "#ffffff",
    text: "#111827",
    textMuted: "#6b7280",
  },

  assets: {
    logo: "/logo.png",
    logoMark: "/logo-mark.png",
    favicon: "/favicon.svg",
    pwaIcon192: "/icons/icon-192.png",
    pwaIcon512: "/icons/icon-512.png",
    loginBackground: "/login-background.png",
    appBackground: "/app-background.png",
  },

  pwa: {
    themeColor: "#1f52a5",
    backgroundColor: "#f5f7fa",
  },

  support: {
    whatsapp: "+62xxxxxxxxxx",
  },
};

import type { ClientTheme } from "../theme.types";

export const yayasanmbgTheme: ClientTheme = {
  clientId: "yayasanmbg",
  companyName: "Yayasan MBG",
  companyShortName: "Yayasan MBG",
  appName: "MBG Task Management",
  appTagline: "Track. Deliver. Grow.",

  colors: {
    primary:    "#1a3fa3",
    accent:     "#4a9fd4",
    highlight:  "#d42b2b",
    background: "#f0f4fb",
    surface:    "#ffffff",
    text:       "#111827",
    textMuted:  "#6b7280",
  },

  assets: {
    logo:       "/clients/yayasanmbg/logo.png",
    logoMark:   "/clients/yayasanmbg/logo-mark.png",
    favicon:    "/clients/yayasanmbg/favicon.svg",
    pwaIcon192: "/clients/yayasanmbg/icons/icon-192.png",
    pwaIcon512: "/clients/yayasanmbg/icons/icon-512.png",
  },

  pwa: {
    themeColor:      "#1a3fa3",
    backgroundColor: "#f0f4fb",
  },

  support: {
    email:    "admin@yayasanmbg.org",
    whatsapp: "+62xxxxxxxxxx",
  },
};
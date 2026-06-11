import type { ClientTheme } from "../theme.types";

export const yayasanmbgTheme: ClientTheme = {
  clientId: "yayasanmbg",
  companyName: "Yayasan MBG",
  companyShortName: "Yayasan MBG",
  appName: "MBG Task Management",
  appTagline: "Track. Deliver. Grow.",

  // Full title on the login hero; the compact header uses the short company name.
  branding: {
    loginTitle: "Task Management Yayasan MBG",
    headerTitle: "Yayasan MBG",
  },

  colors: {
    primary:    "#5c4033",
    accent:     "#8b6914",
    highlight:  "#c17f3a",
    background: "#f5ede0",
    surface:    "#fffaf4",
    text:       "#2c1a0e",
    textMuted:  "#7a6352",
  },

  assets: {
    logo:       "/clients/yayasanmbg/logo.png",
    logoMark:   "/clients/yayasanmbg/logo-mark.png",
    favicon:    "/clients/yayasanmbg/favicon.svg",
    pwaIcon192: "/clients/yayasanmbg/icons/icon-192.png",
    pwaIcon512: "/clients/yayasanmbg/icons/icon-512.png",
    loginBackground: "/clients/yayasanmbg/login-background.jpeg",
    appBackground: "/clients/yayasanmbg/app-background.jpeg",
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
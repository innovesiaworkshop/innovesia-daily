// ─────────────────────────────────────────────
//  ThemeProvider
//  Injects brand colors as CSS variables at the :root level.
//  Wrap your entire app with this once in main.tsx.
//
//  Usage in CSS / Tailwind:
//    var(--color-primary)   → primary brand color
//    var(--color-accent)    → accent color
//    var(--color-highlight) → highlight / badge color
//    etc.
// ─────────────────────────────────────────────

import { useEffect, type ReactNode } from "react";
import { theme } from "../config/theme.registry";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    const root = document.documentElement;

    // Inject color tokens
    root.style.setProperty("--color-primary", theme.colors.primary);
    root.style.setProperty("--color-accent", theme.colors.accent);
    root.style.setProperty("--color-highlight", theme.colors.highlight);
    root.style.setProperty("--color-background", theme.colors.background);
    root.style.setProperty("--color-surface", theme.colors.surface);
    root.style.setProperty("--color-text", theme.colors.text);
    root.style.setProperty("--color-text-muted", theme.colors.textMuted);

    // Update the browser tab title
    document.title = theme.appName;

    // Update PWA theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", theme.pwa.themeColor);
    }

    // Update favicon dynamically
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      favicon.href = theme.assets.favicon;
    }
  }, []);

  return <>{children}</>;
}

// tailwind.config.ts
// ─────────────────────────────────────────────
//  Brand colors come from CSS variables injected by ThemeProvider (per-client theme).
//  Tailwind classes bg-primary/text-accent/etc. — and the legacy navy/sky/gold aliases —
//  reflect the current client's theme. Hex fallbacks avoid a first-paint flash before the
//  ThemeProvider effect sets the vars.
// ─────────────────────────────────────────────

import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Semantic brand tokens (use these going forward) ──
        primary: 'var(--color-primary, #1f52a5)',
        accent: 'var(--color-accent, #14b4e8)',
        highlight: 'var(--color-highlight, #ffce0f)',
        background: 'var(--color-background, #f5f7fa)',
        surface: 'var(--color-surface, #ffffff)',
        'text-base': 'var(--color-text, #111827)',
        'text-muted': 'var(--color-text-muted, #6b7280)',

        // ── Legacy aliases (keep existing bg-navy / text-sky / bg-gold working) ──
        navy: 'var(--color-primary, #1f52a5)',
        sky: 'var(--color-accent, #14b4e8)',
        gold: 'var(--color-highlight, #ffce0f)',

        // ── Non-brand glass canvas (design constant, not themed) ──
        cloud: '#d4d9dd',
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 2px 6px rgba(15, 23, 42, 0.04), 0 12px 30px rgba(15, 23, 42, 0.08)',
        glass:
          '0 2px 6px rgba(15, 23, 42, 0.05), 0 14px 34px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        pill: '0 6px 16px rgba(31, 82, 165, 0.20)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '1rem',
        xl: '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config

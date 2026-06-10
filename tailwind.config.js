/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Innovesia brand palette (see CLAUDE.md)
        navy: '#1f52a5', // primary buttons, headers, active
        sky: '#14b4e8', // accents, links, secondary
        gold: '#ffce0f', // highlights, pending / needs-action badges
        cloud: '#d4d9dd', // app canvas behind frosted-glass cards
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
        // Soft, diffuse card shadow (borderless cards rely on this; matches the refs).
        card: '0 2px 6px rgba(15, 23, 42, 0.04), 0 12px 30px rgba(15, 23, 42, 0.08)',
        // Frosted-glass card: soft shadow + a 1px translucent white top-edge highlight.
        glass:
          '0 2px 6px rgba(15, 23, 42, 0.05), 0 14px 34px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        // Slightly tighter elevation for buttons / floating controls.
        pill: '0 6px 16px rgba(31, 82, 165, 0.20)',
      },
    },
  },
  plugins: [],
}

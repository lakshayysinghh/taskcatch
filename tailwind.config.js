/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neutral surfaces and text come from CSS variables in src/theme.css.
        canvas: 'var(--canvas)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
        },
        // Brand and status colours are literal so opacity modifiers (bg-olive-300/10) work.
        olive: {
          50: '#f3f5e6',
          100: '#e2e6c8',
          200: '#ccd2a3',
          300: '#b4bb82',
          400: '#9ca267',
          500: '#80874f',
          600: '#656b3e',
          700: '#4b502e',
          800: '#33361f',
          900: '#1f2113',
        },
        danger: '#f07e6e',
        warning: '#e6b45c',
        success: '#82c98d',
        info: '#8fb4e6',
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', '"Cascadia Code"', 'Consolas', 'monospace'],
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.035) inset, 0 1px 2px rgba(0,0,0,0.4)',
        pop: '0 0 0 1px rgba(0,0,0,0.5), 0 24px 64px -16px rgba(0,0,0,0.85), 0 1px 0 0 rgba(255,255,255,0.05) inset',
        glow: '0 1px 0 0 rgba(255,255,255,0.35) inset, 0 10px 30px -10px rgba(180,187,130,0.55)',
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translate3d(-50%, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(-48%, 3%, 0) scale(1.06)' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        drift: 'drift 28s ease-in-out infinite',
        wave: 'wave 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // `prose` styles for Markdown replies in MorningStandupModal
    require('tailwindcss-animate'), // animate-in / fade-in / zoom-in-95 for dialogs and toasts
  ],
};

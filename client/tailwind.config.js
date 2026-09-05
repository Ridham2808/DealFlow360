/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './context/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        supabase: {
          bg: '#09090b',
          card: '#121215',
          panel: '#18181b',
          border: '#27272a',
          hover: '#1f1f23',
          subtle: '#3f3f46',
          muted: '#71717a',
          light: '#a1a1aa',
          bright: '#fafafa',
        },
      },
      fontFamily: {
        mono: ['var(--font-geist-mono)', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['var(--font-geist-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'supabase-glow': '0 0 40px -10px rgba(255, 255, 255, 0.08)',
        'supabase-card': '0 4px 20px -2px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)',
      },
    },
  },
  plugins: [],
};


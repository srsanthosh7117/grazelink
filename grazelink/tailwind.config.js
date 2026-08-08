/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#22C55E',
          dark: '#16A34A',
          light: '#4ADE80',
        },
        secondary: {
          DEFAULT: '#43A047',
        },
        surface: '#FFFFFF',
        'surface-light': '#F8FAFC',
        ink: '#111827',
        muted: '#6B7280',
        'dark-bg': '#0B0F19',
        'dark-surface': '#111827',
        'dark-card': '#1F2937',
        'dark-border': '#374151',
        'dark-muted': '#9CA3AF',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -4px rgba(17, 24, 39, 0.08)',
        card: '0 2px 12px -2px rgba(34, 197, 94, 0.12)',
        glow: '0 0 40px -8px rgba(34, 197, 94, 0.35)',
        'dark-card': '0 4px 20px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropBlur: {
        glass: '16px',
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
      },
      animation: {
        floaty: 'floaty 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

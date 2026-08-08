/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base: dark pasture-at-night surfaces
        pasture: {
          950: '#0F1310', // page background
          900: '#161C14', // panel background
          800: '#1E2419', // card surface
          700: '#2A3323', // border / divider
          600: '#3C4633', // hover surface
        },
        bone: {
          100: '#EDEBE2', // primary text
          300: '#C9C7BA', // secondary text
          500: '#8B9282', // muted / caption text
        },
        // Signal colors mirror the physical collar's LED language exactly
        signal: {
          blue: '#5FA8D3', // wifi / cloud sync
          yellow: '#E8B23C', // grazing mode
          green: '#6FA65A', // battery healthy
          red: '#D1553D', // battery low / critical
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(237,235,226,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.8' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

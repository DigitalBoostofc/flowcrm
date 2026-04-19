import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#EEEEFF',
          100: '#D8D8FF',
          200: '#B8B7FF',
          300: '#9996FF',
          400: '#7A77FF',
          500: '#635BFF',
          600: '#4B44E8',
          700: '#3830C5',
          800: '#2820A0',
          900: '#1A1480',
        },
      },
      animation: {
        'slide-in':  'slide-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-up':   'fade-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in':   'fade-in 0.15s ease',
        'shimmer':   'shimmer 1.8s ease-in-out infinite',
      },
      keyframes: {
        'slide-in': {
          '0%':   { transform: 'translateX(calc(100% + 1rem))', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(6px) scale(0.99)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'stripe':    '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        'stripe-md': '0 4px 16px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)',
        'stripe-lg': '0 8px 32px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.05)',
        'brand':     '0 0 0 3px rgba(99,91,255,0.20)',
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          background: '#0b1120',
          foreground: '#cbd5f5'
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f1f5f9',
          border: '#e2e8f0'
        },
        primary: {
          DEFAULT: '#2563eb',
          foreground: '#ffffff'
        },
        accent: {
          DEFAULT: '#22c55e'
        }
      },
      fontFamily: {
        sans: ['"Inter"', ...defaultTheme.fontFamily.sans]
      },
      borderRadius: {
        xl: '1rem'
      },
      boxShadow: {
        subtle: '0 10px 30px -15px rgba(15, 23, 42, 0.25)',
        focus: '0 0 0 4px rgba(37, 99, 235, 0.15)'
      }
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;

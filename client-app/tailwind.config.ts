import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          background: '#022c22',
          foreground: '#f9fafb',
          primary: '#0ea5e9',
          secondary: '#f97316',
          muted: '#0f766e',
          accent: '#34d399',
          subtle: '#e0f2fe'
        }
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
        sans: ['"Inter"', ...defaultTheme.fontFamily.sans]
      },
      backgroundImage: {
        'gradient-hero': 'radial-gradient(circle at top left, rgba(79, 70, 229, 0.25), transparent 55%), radial-gradient(circle at bottom right, rgba(249, 115, 22, 0.2), transparent 52%)'
      },
      boxShadow: {
        glow: '0 25px 50px -12px rgba(79, 70, 229, 0.35)',
        card: '0 20px 45px -20px rgba(15, 23, 42, 0.45)'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        fadeup: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        fadeup: 'fadeup 0.8s ease forwards'
      }
    }
  },
  plugins: []
};

export default config;

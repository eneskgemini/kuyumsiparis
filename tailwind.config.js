/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FBF8F1',
          100: '#F5EBD6',
          200: '#EAD8AC',
          300: '#DCBE76',
          400: '#CBA24A',
          500: '#B3862F',
          600: '#916B22',
          700: '#70521B',
          800: '#543C16',
          900: '#3D2C10',
        },
        ink: {
          50: '#F7F7F6',
          100: '#EEEEEC',
          200: '#DDDCD8',
          300: '#C2C0B9',
          400: '#96938A',
          500: '#716E65',
          600: '#57544D',
          700: '#44423C',
          800: '#2B2A26',
          900: '#1B1A17',
          950: '#100F0D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(27,26,23,0.04), 0 6px 20px -6px rgba(27,26,23,0.10)',
        lift: '0 2px 4px 0 rgba(27,26,23,0.05), 0 16px 32px -12px rgba(27,26,23,0.16)',
        gold: '0 8px 24px -8px rgba(179,134,47,0.45)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        zoomIn: { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        slideInLeft: { from: { opacity: '0', transform: 'translateX(-16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fadeIn .4s ease-out both',
        'zoom-in': 'zoomIn .3s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up': 'slideUp .45s cubic-bezier(0.16,1,0.3,1) both',
        'slide-down': 'slideDown .3s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-right': 'slideInRight .35s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-left': 'slideInLeft .35s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
}

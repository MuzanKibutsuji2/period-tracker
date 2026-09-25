/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif']
      },
      boxShadow: {
        soft: '0 8px 30px -12px rgba(80, 70, 140, 0.25)',
        card: '0 1px 2px rgba(16,16,40,0.05), 0 8px 24px -12px rgba(16,16,40,0.12)'
      },
      borderRadius: { '4xl': '2rem' }
    }
  },
  plugins: []
};

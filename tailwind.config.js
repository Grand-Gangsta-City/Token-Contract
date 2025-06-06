/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './app/**/*.{js,ts,jsx,tsx}',
      './components/**/*.{js,ts,jsx,tsx}'
    ],
    theme: {
      extend: {
        colors: {
          gold: '#D4AF37',
          dark: '#1A202C',
          light: '#F7FAFC'
        },
        backgroundImage: {
          'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #FFD700 100%)'
        }
      }
    },
    plugins: []
  };
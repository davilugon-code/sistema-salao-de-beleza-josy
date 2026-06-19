/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Cormorant Garamond"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        base: 'var(--bg-base)',
        sidebar: 'var(--bg-sidebar)',
        card: 'var(--bg-card)',
        'border-card': 'var(--border-card)',
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-light': 'var(--primary-light)',
        'text-main': 'var(--text-main)',
        'text-muted': 'var(--text-muted)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        'sidebar-active': 'var(--sidebar-active)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        modal: 'var(--shadow-modal)',
        dropdown: 'var(--shadow-dropdown)',
      },
      borderRadius: {
        'card': '12px',
        'input': '8px',
        'button': '8px',
        'badge': '999px',
        'modal': '16px',
      }
    },
  },
  plugins: [],
}

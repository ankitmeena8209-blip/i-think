/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'surface': '#f9f9f7',
        'surface-dim': '#dadad8',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f4f4f2',
        'surface-container': '#eeeeec',
        'surface-container-high': '#e8e8e6',
        'surface-container-highest': '#e2e3e1',
        'surface-variant': '#e2e3e1',
        'surface-bright': '#f9f9f7',
        'on-surface': '#1a1c1b',
        'on-surface-variant': '#444748',
        'background': '#f9f9f7',
        'on-background': '#1a1c1b',
        'primary': '#000000',
        'on-primary': '#ffffff',
        'secondary': '#5e5e5e',
        'on-secondary': '#ffffff',
        'outline': '#747878',
        'outline-variant': '#c4c7c7',
        'error': '#ba1a1a',
        'dark-bg': '#111111',
        'dark-surface': '#1a1a1a',
        'dark-primary': '#fafaf8',
        'dark-secondary': '#a1a1a1',
        'dark-border': '#2a2a2a'
      },
      borderRadius: {
        'DEFAULT': '0.25rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        'full': '9999px',
        'swiss': '14px',
        '14': '14px'
      },
      spacing: {
        'unit': '8px',
        'margin-mobile': '20px',
        'margin-desktop': '64px',
        'gutter': '24px',
        'container-max': '1120px'
      },
      fontFamily: {
        'display': ['Geist', 'sans-serif'],
        'body-md': ['Geist', 'sans-serif'],
        'display-mobile': ['Geist', 'sans-serif'],
        'headline-lg': ['Geist', 'sans-serif'],
        'headline-md': ['Geist', 'sans-serif'],
        'body-lg': ['Geist', 'sans-serif'],
        'label-md': ['Geist', 'sans-serif'],
        'label-sm': ['Geist', 'sans-serif']
      },
      fontSize: {
        'display': ['48px', { lineHeight: '1.1', letterSpacing: '-0.04em', fontWeight: '600' }],
        'display-mobile': ['36px', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '600' }],
        'headline-lg': ['32px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '500' }],
        'headline-md': ['24px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '500' }],
        'body-lg': ['18px', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '1.4', letterSpacing: '0.04em', fontWeight: '500' }]
      }
    }
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "var(--bg)",
          elevated: "var(--bg-elevated)",
          muted: "var(--bg-muted)",
        },
        fg: {
          DEFAULT: "var(--fg)",
          muted: "var(--fg-muted)",
        },
        border: "var(--border)",
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        warn: {
          DEFAULT: "var(--warn)",
          bg: "var(--warn-bg)",
          border: "var(--warn-border)",
        },
        safe: {
          DEFAULT: "var(--safe)",
          bg: "var(--safe-bg)",
          border: "var(--safe-border)",
        },
        unverified: {
          DEFAULT: "var(--unverified)",
          bg: "var(--unverified-bg)",
          border: "var(--unverified-border)",
        },
      },
      fontFamily: {
        display: ['"Archivo"', "sans-serif"],
        sans: ['"Inter"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

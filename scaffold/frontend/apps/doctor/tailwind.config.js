export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ['"Archivo"', "sans-serif"],
        sans: ['"Inter"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        doc: {
          bg: "#0a0b0d",
          elevated: "#111318",
          card: "#161920",
          hover: "#1c1f28",
          border: "#252830",
          "border-focus": "#3b3f4a",
          fg: "#e8eaed",
          "fg-muted": "#7a7e8a",
          "fg-dim": "#4a4e58",
          accent: "#6c8aff",
          "accent-hover": "#8ba4ff",
        },
        severity: {
          critical: "#ff4444",
          warning: "#ffaa22",
          safe: "#44cc66",
          info: "#4488ff",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s infinite",
      },
      boxShadow: {
        "clinical": "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
        "clinical-lg": "0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [],
};

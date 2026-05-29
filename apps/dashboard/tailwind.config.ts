import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          page: "var(--bg-page)",
          sidebar: "var(--bg-sidebar)",
          surface: "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
        },
        border: {
          soft: "var(--border-soft)",
          card: "var(--border-card)",
          active: "var(--border-active)",
        },
        text: {
          primary: "var(--text-primary)",
          strong: "var(--text-strong)",
          muted: "var(--text-muted)",
          subtle: "var(--text-subtle)",
          faint: "var(--text-faint)",
          disabled: "var(--text-disabled)",
        },
        flag: {
          normal: "var(--flag-normal)",
          low: "var(--flag-low)",
          high: "var(--flag-high)",
          critical: "var(--flag-critical)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

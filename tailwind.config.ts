import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ─── Section 3 Color Tokens: Warm Cream & Vibrant Amber/Orange ────────
      colors: {
        ink: "#1C1917", // warm stone-900 ink
        paper: "#FAF7F2", // rich warm cream background
        surface: "#FFFFFF",
        line: "#E7E2D9", // soft warm sand border
        accent: "#E05A2B", // vibrant medical sunset orange / amber
        "accent-hover": "#C84B1F",
        "flag-high": "#DC2626", // bold crimson
        "flag-low": "#D97706", // warm amber
        "flag-normal": "#15803D", // clinical emerald
        "ai-generated": "#7C3AED", // royal amethyst
        // Orange & Cream Shades
        "accent-50": "#FFF7ED", // soft orange cream
        "accent-100": "#FFEDD5", // warm peach highlight
        "accent-200": "#FED7AA",
        "accent-500": "#F97316",
        "accent-600": "#E05A2B",
        "accent-900": "#7C2D12",
        cream: {
          50: "#FCFAF6",
          100: "#FAF7F2",
          200: "#F4EFE6",
          300: "#ECE5D8",
          400: "#DCD2C0",
        },
      },
      // ─── CSS Variables (for use in globals.css) ──────────────────────────────
      backgroundColor: {
        paper: "#F7F8F6",
        surface: "#FFFFFF",
      },
      // ─── Typography ──────────────────────────────────────────────────────────
      fontFamily: {
        serif: ["var(--font-serif)", "Source Serif 4", "Lora", "Georgia", "serif"],
        sans: ["var(--font-inter)", "Inter", "IBM Plex Sans", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      // ─── Border Colors ────────────────────────────────────────────────────────
      borderColor: {
        line: "#DDE2E0",
        accent: "#1D6E78",
        "flag-high": "#B3492F",
        "flag-low": "#B7822A",
        "flag-normal": "#3F7A54",
        "ai-generated": "#6B5CA5",
      },
      // ─── Border Radius ────────────────────────────────────────────────────────
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        full: "9999px",
      },
      // ─── Box Shadow ───────────────────────────────────────────────────────────
      boxShadow: {
        xs: "0 1px 2px rgba(16, 24, 38, 0.05)",
        sm: "0 1px 3px rgba(16, 24, 38, 0.08), 0 1px 2px rgba(16, 24, 38, 0.04)",
        DEFAULT:
          "0 2px 4px rgba(16, 24, 38, 0.06), 0 1px 2px rgba(16, 24, 38, 0.04)",
        md: "0 4px 8px rgba(16, 24, 38, 0.08), 0 2px 4px rgba(16, 24, 38, 0.04)",
        none: "none",
      },
      // ─── Spacing extras ───────────────────────────────────────────────────────
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "88": "22rem",
        "112": "28rem",
        "128": "32rem",
        "144": "36rem",
      },
      // ─── Animation ────────────────────────────────────────────────────────────
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

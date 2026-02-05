import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      colors: {
        border: "hsl(var(--border) / 0.08)",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        teal: "hsl(var(--teal))",
        amber: "hsl(var(--amber))",
        magenta: "hsl(var(--magenta))",
        "purple-deep": "hsl(var(--purple-deep))",
        "purple-glow": "hsl(var(--purple-glow))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "pulse-cta": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(192 100% 50% / 0.4), 0 0 20px hsl(252 70% 45% / 0.3)" },
          "50%": { boxShadow: "0 0 0 12px hsl(192 100% 50% / 0), 0 0 40px hsl(252 70% 45% / 0.5)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "fade-in": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "fade-in-slow": { from: { opacity: "0" }, to: { opacity: "1" } },
        "wave-travel": {
          "0%": { transform: "translateX(-20%) scaleY(0.8)", opacity: "0" },
          "20%": { opacity: "1" },
          "100%": { transform: "translateX(60%) scaleY(1.1)", opacity: "0" },
        },
        "brain-pulse": {
          "0%, 100%": { filter: "brightness(1) saturate(1)" },
          "50%": { filter: "brightness(1.15) saturate(1.2)" },
        },
        "region-pulse": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.4)" },
        },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        "blink": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.3" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-cta": "pulse-cta 2.4s ease-in-out infinite",
        "gradient-shift": "gradient-shift 6s ease infinite",
        "fade-in": "fade-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in-slow": "fade-in-slow 1.2s ease-out both",
        "wave-travel": "wave-travel 4s cubic-bezier(0.42, 0, 0.58, 1) forwards",
        "brain-pulse": "brain-pulse 3s ease-in-out infinite",
        "region-pulse": "region-pulse 2s ease-in-out infinite",
        "spin-slow": "spin-slow 20s linear infinite",
        "blink": "blink 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

import type { Config } from "tailwindcss";

/**
 * Chudiwalas Fine Jewellery — brand design tokens.
 * Source: docs/Chudiwalas_Brand_Guidelines.pdf (page 6, 7).
 *
 * Official palette
 *   Olive Green   #556B2F  Primary: headers, footer, key sections
 *   Burnt Orange  #CC5500  Accent: buttons, links, highlights (≈5% of the page)
 *   Ivory White   #F6F0E2  Page background, cards
 *   Charcoal      #1A1A1A  Body text, black logo
 *
 * Legacy scale names (gold, plum, rose, emerald, sage) are kept as aliases so
 * existing class usage resolves to the brand palette without a rewrite.
 */

const olive = {
  50: "#F3F5EC",
  100: "#E7EBDC",
  200: "#CFD8B9",
  300: "#B1BF90",
  400: "#8CA05E",
  500: "#6E8740",
  600: "#556B2F", // Brand Olive Green
  700: "#45561F",
  800: "#364318",
  900: "#283213",
  950: "#161C0A",
  DEFAULT: "#556B2F",
};

const orange = {
  50: "#FFF4EA",
  100: "#FDE4CC",
  200: "#F8C59A",
  300: "#F0A066",
  400: "#E57A33",
  500: "#CC5500", // Brand Burnt Orange
  600: "#B04A00",
  700: "#8F3C00",
  800: "#6E2E00",
  900: "#4D2000",
  DEFAULT: "#CC5500",
};

const ivory = {
  50: "#FCFAF4",
  tile: "#F7F4EE", // product photo background and light panels
  100: "#F6F0E2", // Brand Ivory White
  200: "#EFE7D3",
  300: "#E9E2CC",
  400: "#DCD3B8",
  500: "#C8BD9E",
  DEFAULT: "#F6F0E2",
};

const charcoal = {
  50: "#F5F5F4",
  100: "#E7E5E4",
  200: "#D6D3D1",
  300: "#A8A29E",
  400: "#78716C",
  500: "#57534E",
  600: "#44403C",
  700: "#3A3A3A",
  800: "#2A2A2A",
  900: "#1F1F1F",
  950: "#1A1A1A", // Brand Charcoal Black
  DEFAULT: "#1A1A1A",
};

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        canvas: "#FFFFFF",
        olive,
        orange,
        ivory,
        charcoal,
        // Legacy aliases → brand palette
        gold: olive,
        plum: olive,
        emerald: olive,
        rose: orange,
        sage: {
          DEFAULT: olive[100],
          light: olive[50],
          dark: olive[600],
        },
        border: {
          light: "#EFE7D3",
          DEFAULT: "#DCD3B8", // Ivory 400
          dark: "#556B2F",
        },
      },
      fontFamily: {
        // Poppins is the only typeface in the project. `serif` and `mono` are
        // kept as aliases so existing class names keep working.
        sans: ["var(--font-poppins)", "Poppins", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-poppins)", "Poppins", "system-ui", "sans-serif"],
        mono: ["var(--font-poppins)", "Poppins", "system-ui", "sans-serif"],
      },
      maxWidth: {
        "8xl": "88rem",
      },
      borderRadius: {
        arch: "999px 999px 0 0",
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(26, 26, 26, 0.05)",
        card: "0 4px 20px -2px rgba(26, 26, 26, 0.06)",
        dropdown: "0 10px 30px -4px rgba(26, 26, 26, 0.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: "#FAF6F0",
          100: "#F3ECE2",
          200: "#EDE1D2",
        },
        paper: "#FFFCF8",
        blush: "#F6E9E6",
        wine: {
          50: "#F6EDEF",
          100: "#E9D4D9",
          200: "#D3A9B2",
          400: "#7A3245",
          500: "#5B2333",
          600: "#4A1C29",
          700: "#3A161F",
          900: "#241014",
        },
        sage: {
          50: "#F3F5F0",
          100: "#E6EADF",
          200: "#D0D9C3",
          300: "#C3CEB8",
          500: "#A8B79A",
          700: "#5F6E53",
          900: "#3F4838",
        },
        gold: {
          50: "#FBF7EE",
          100: "#F2E6CB",
          200: "#E7D2A0",
          300: "#DDC08A",
          500: "#C9A96E",
          700: "#8A6B34",
          900: "#5E4A26",
        },
        rose: {
          50: "#F9EEEE",
          100: "#EFD7D8",
          200: "#DDACAE",
          300: "#CF9498",
          500: "#B15B62",
          700: "#8C3F45",
          900: "#5A2529",
        },
        plum: {
          DEFAULT: "#241419",
          50: "#F5F1F2",
          100: "#E7DEE0",
          400: "#6E5C63",
          600: "#4A3940",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(91, 35, 51, 0.06), 0 4px 10px -4px rgba(91, 35, 51, 0.10)",
        "soft-lg": "0 2px 4px 0 rgba(91, 35, 51, 0.07), 0 12px 24px -8px rgba(91, 35, 51, 0.14)",
      },
      borderRadius: {
        card: "12px",
      },
      backgroundImage: {
        "wash-blush": "linear-gradient(180deg, #F7EAE7 0%, #F9EFEA 30%, #FAF6F0 75%, #FAF6F0 100%)",
      },
    },
  },
  plugins: [],
};
export default config;

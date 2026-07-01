import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(214 22% 88%)",
        surface: "hsl(0 0% 100%)",
        ink: "hsl(222 28% 13%)",
        muted: "hsl(215 15% 48%)",
        accent: "hsl(168 62% 30%)",
        warning: "hsl(38 92% 46%)",
        danger: "hsl(0 72% 45%)"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 23, 42, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;


import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: "#f8fafc",
        ink: "#0f172a",
        accent: "#0f766e",
        accentSoft: "#14b8a6"
      }
    }
  },
  plugins: []
};

export default config;

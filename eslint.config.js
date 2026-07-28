// eslint.config.js
import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import tailwind from "eslint-plugin-tailwindcss";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig(
  // Ignore build output & deps
  {
    ignores: ["dist/**", "node_modules/**", ".astro/**"],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Astro recommended rules — use FLAT config key
  ...astro.configs["flat/recommended"],

  // Global settings for browser + node
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // Tailwind plugin — manual flat config (safer than spreading configs object)
  {
    plugins: {
      tailwindcss: tailwind,
    },
    rules: {
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/no-custom-classname": "off",
      "tailwindcss/no-contradicting-classname": "error",
    },
    settings: {
      tailwindcss: {
        callees: ["classnames", "clsx", "ctl", "cva", "tv"],
        cssConfigPath: "./src/styles/global.css",
      },
    },
  },

  // Custom overrides
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn"],
    },
  }
);

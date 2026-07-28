// eslint.config.js
import js from "@eslint/js";
import tailwind from "eslint-plugin-tailwindcss";
import globals from "globals";
import { defineConfig } from "eslint/config";
import tseslint from 'typescript-eslint';
import eslintPluginAstro from "eslint-plugin-astro"
export default defineConfig(
  // Ignore build output & deps
  {
    ignores: ["dist/**", "node_modules/**", ".astro/**"],
  },
  {
    extends: [js.configs.recommended, tseslint.configs.recommended,eslintPluginAstro.configs.recommended],
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

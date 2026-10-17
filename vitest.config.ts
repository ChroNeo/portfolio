/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig(
  {
    test: {
      include: ["src/**/*.test.{ts,tsx}"],
    },
  },
  {
    // Tests render CMS media URLs. The no-op image service passes them through
    // instead of fetching and transforming them, so the suite stays hermetic.
    image: { service: { entrypoint: "astro/assets/services/noop" } },
  },
);

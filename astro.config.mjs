// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// `@tailwindcss/vite` and Astro can resolve slightly different `vite`
// versions, which produces a harmless Plugin-type mismatch under
// `astro check`. The cast keeps the config type-clean.
const vitePlugins = /** @type {any} */ ([tailwindcss()]);

// https://astro.build/config
export default defineConfig({
  site: "https://blog.drwip.com",
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: vitePlugins,
  },
});

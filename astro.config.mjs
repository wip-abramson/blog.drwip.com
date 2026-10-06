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
  site: "https://thinking.drwip.com",
  integrations: [
    mdx(),
    // The blyg's `t/{id}/` and `f/{id}/` permalinks only forward to the
    // writing, which the sitemap already lists.
    sitemap({ filter: (page) => !/\/blyg\/[tf]\//.test(page) }),
  ],
  vite: {
    plugins: vitePlugins,
  },
});

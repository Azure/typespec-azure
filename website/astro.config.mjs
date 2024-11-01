// @ts-check
import starlight from "@astrojs/starlight";
import { processSidebar } from "@typespec/astro-utils/sidebar";
import astroExpressiveCode from "astro-expressive-code";
import { defineConfig } from "astro/config";
import { resolve } from "path";
import current from "./src/content/current-sidebar";

// https://astro.build/config
export default defineConfig({
  integrations: [
    astroExpressiveCode(),
    starlight({
      title: "My Docs",
      sidebar: await processSidebar(
        resolve(import.meta.dirname, "src/content/docs"),
        "docs",
        current,
      ),
      social: {
        github: "https://github.com/withastro/starlight",
      },
      sidebar: [
        {
          label: "Guides",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Example Guide", slug: "guides/example" },
          ],
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
      ],
    }),
  ],
});

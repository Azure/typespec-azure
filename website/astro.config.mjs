// @ts-check
import starlight from "@astrojs/starlight";
import { processSidebar } from "@typespec/astro-utils/sidebar";
import astroExpressiveCode from "astro-expressive-code";
import { defineConfig } from "astro/config";
import { resolve } from "path";
import current from "./src/content/current-sidebar";

const base = process.env.TYPESPEC_WEBSITE_BASE_PATH ?? "/";

// https://astro.build/config
export default defineConfig({
  base,
  site: "https://azure.github.io/typespec-azure",
  trailingSlash: "always",
  integrations: [
    astroExpressiveCode(),
    starlight({
      title: "TypeSpec Azure",
      sidebar: await processSidebar(
        resolve(import.meta.dirname, "src/content/docs"),
        "docs",
        current,
      ),
      favicon: "/azure.svg",
      expressiveCode: false, // defined directly above
      social: {
        github: "https://github.com/Azure/typespec-azure",
      },
    }),
  ],
});

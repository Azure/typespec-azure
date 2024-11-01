// @ts-check
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";
import { TypeSpecLang } from "@typespec/astro-utils/shiki";
import { processSidebar } from "@typespec/astro-utils/sidebar";
import astroExpressiveCode from "astro-expressive-code";
import rehypeAstroRelativeMarkdownLinks from "astro-rehype-relative-markdown-links";
import { defineConfig } from "astro/config";
import { resolve } from "path";
import remarkHeadingID from "remark-heading-id";
import current from "./src/content/current-sidebar";

const base = process.env.TYPESPEC_WEBSITE_BASE_PATH ?? "/";

// https://astro.build/config
export default defineConfig({
  base,
  site: "https://azure.github.io/typespec-azure",
  trailingSlash: "always",
  redirects: {
    "/docs/": "/docs/intro/",
  },
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
      customCss: ["./src/css/custom.css"],
      components: {
        Header: "./src/components/header/header.astro",
      },
    }),
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  markdown: {
    // @ts-expect-error wrong type
    remarkPlugins: [remarkHeadingID],
    rehypePlugins: [
      [
        rehypeAstroRelativeMarkdownLinks,
        { base, contentPath: "src/content/docs", trailingSlash: "always" },
      ],
    ],
    shikiConfig: {
      langs: [TypeSpecLang],
    },
  },
});

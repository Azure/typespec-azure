// @ts-check
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
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
    // Redirects for versioning docs reorganization
    "docs/howtos/versioning/arm/02-preview-after-preview/":
      "docs/howtos/versioning/02-preview-after-preview/",
    "docs/howtos/versioning/arm/03-stable-after-preview/":
      "docs/howtos/versioning/03-stable-after-preview/",
    "docs/howtos/versioning/arm/04-preview-after-stable/":
      "docs/howtos/versioning/04-preview-after-stable/",
    "docs/howtos/versioning/arm/05-stable-after-stable/":
      "docs/howtos/versioning/05-stable-after-stable/",
    "docs/howtos/versioning/arm/01-about-versioning/":
      "docs/howtos/versioning/01-about-versioning/",
    "docs/howtos/versioning/01-preview-version/": "docs/howtos/versioning/01-about-versioning/",
    "docs/howtos/arm/versioning/": "docs/howtos/versioning/06-evolving-apis/",
    "docs/howtos/versioning/arm/uncommon-scenarios/01-converting-specs/":
      "docs/howtos/versioning/uncommon-scenarios/01-converting-specs/",
    "docs/howtos/versioning/arm/uncommon-scenarios/02-perpetual-preview/":
      "docs/howtos/versioning/uncommon-scenarios/02-perpetual-preview/",
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
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/Azure/typespec-azure" },
      ],
      customCss: ["./src/css/custom.css"],
      components: {
        Header: "./src/components/header/header.astro",
      },
    }),
    react(),
  ],
  markdown: {
    // @ts-expect-error wrong type
    remarkPlugins: [remarkHeadingID],
    rehypePlugins: [
      [rehypeAstroRelativeMarkdownLinks, { base, collectionBase: false, trailingSlash: "always" }],
    ],
    shikiConfig: {
      langs: [TypeSpecLang],
    },
  },
});

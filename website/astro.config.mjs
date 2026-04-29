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

const rawBase = process.env.TYPESPEC_WEBSITE_BASE_PATH ?? "/";
const base = rawBase.startsWith("/") ? rawBase : `/${rawBase}`;

// https://astro.build/config
export default defineConfig({
  base,
  site: "https://azure.github.io/typespec-azure",
  trailingSlash: "always",
  redirects: {
    "/docs/": "/docs/intro/",
    // Redirects for versioning docs reorganization
    "/docs/howtos/Versioning/ARM/02-preview-after-preview/":
      "/docs/howtos/Versioning/02-preview-after-preview/",
    "/docs/howtos/Versioning/ARM/03-stable-after-preview/":
      "/docs/howtos/Versioning/03-stable-after-preview/",
    "/docs/howtos/Versioning/ARM/04-preview-after-stable/":
      "/docs/howtos/Versioning/04-preview-after-stable/",
    "/docs/howtos/Versioning/ARM/05-stable-after-stable/":
      "/docs/howtos/Versioning/05-stable-after-stable/",
    "/docs/howtos/Versioning/ARM/01-about-versioning/":
      "/docs/howtos/Versioning/01-about-versioning/",
    "/docs/howtos/Versioning/01-preview-version/": "/docs/howtos/Versioning/01-about-versioning/",
    "/docs/howtos/ARM/versioning/": "/docs/howtos/Versioning/06-evolving-apis/",
    "/docs/howtos/Versioning/ARM/uncommon-scenarios/01-converting-specs/":
      "/docs/howtos/Versioning/uncommon-scenarios/01-converting-specs/",
    "/docs/howtos/Versioning/ARM/uncommon-scenarios/02-perpetual-preview/":
      "/docs/howtos/Versioning/uncommon-scenarios/02-perpetual-preview/",
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

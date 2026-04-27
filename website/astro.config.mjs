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
import { visit } from "unist-util-visit";
import current from "./src/content/current-sidebar";

const base = process.env.TYPESPEC_WEBSITE_BASE_PATH ?? "/";

/**
 * Rewrite absolute markdown links produced by `tspd doc` for linter rules
 * (e.g. `/libraries/azure-resource-manager/rules/arm-no-record.md`) so that
 * they resolve to the actual website URL (`/docs/libraries/.../arm-no-record/`).
 *
 * `astro-rehype-relative-markdown-links` only rewrites *relative* markdown
 * links, so these absolute paths would otherwise be emitted verbatim and
 * 404 because of the trailing `.md` and the missing `/docs/` prefix.
 */
function rehypeFixAbsoluteLibraryMdLinks() {
  return (tree) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "a") return;
      const href = node.properties && node.properties.href;
      if (typeof href !== "string") return;
      if (!href.startsWith("/libraries/")) return;
      // Only rewrite links that point to a markdown file.
      const mdMatch = href.match(/^(\/libraries\/[^?#]+?)\.md(\?[^#]*)?(#.*)?$/);
      if (!mdMatch) return;
      const [, pathPart, search = "", hash = ""] = mdMatch;
      node.properties.href = `/docs${pathPart}/${search}${hash}`;
    });
  };
}

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
      rehypeFixAbsoluteLibraryMdLinks,
    ],
    shikiConfig: {
      langs: [TypeSpecLang],
    },
  },
});

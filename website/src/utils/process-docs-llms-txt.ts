import { processDocsForLlmsTxt } from "@typespec/astro-utils/llmstxt";
import { getCollection } from "astro:content";

export async function processDocsForTypeSpecLlmsTxt(site?: URL) {
  const docs = await getCollection("docs", (entry) => !!entry.data.llmstxt);
  const result = await processDocsForLlmsTxt({
    title: "TypeSpec Azure Documentation",
    description:
      "TypeSpec Azure provides libraries, tools, and patterns for building Azure APIs using TypeSpec. This includes both Azure Resource Manager (ARM) APIs and data-plane APIs.",
    docs,
    llmsSections,
    site,
  });
  return result;
}

const llmsSections = [
  { name: "Getting Started", pattern: "docs/getstarted/(?!azure-resource-manager|azure-core).*" },
  {
    name: "Azure Resource Manager (ARM)",
    pattern:
      "docs/(libraries/azure-resource-manager|getstarted/azure-resource-manager|howtos/arm)/**",
  },
  {
    name: "Azure Core",
    pattern: "docs/(libraries/azure-core|getstarted/azure-core)/**",
  },
  { name: "Client Generation", pattern: "docs/libraries/typespec-client-generator-core/**" },
  { name: "Emitters", pattern: "docs/emitters/**" },
  { name: "Optional", pattern: "docs/**" },
];

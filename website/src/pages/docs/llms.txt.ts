import { generateLlmstxt, processDocsForLlmsTxt } from "@typespec/astro-utils/llmstxt";
import type { APIRoute } from "astro";
import { collectLlmsDocs, generateLlmsTopics } from "../../utils/llmstxt";

export const GET: APIRoute = async ({ site }) => {
  const { docs, libraryNames } = await collectLlmsDocs();

  const topics = generateLlmsTopics({ libraryNames, docs });

  const llmsData = await processDocsForLlmsTxt({
    title: "TypeSpec Azure Documentation",
    description:
      "TypeSpec Azure provides libraries, tools, and patterns for building Azure APIs using TypeSpec. This includes both Azure Resource Manager (ARM) APIs and data-plane APIs.",
    docs,
    llmsSections: topics.map((topic) => ({
      name: topic.title,
      pathPrefix: topic.pathPrefix,
    })),
    site,
  });

  const llmstxt = generateLlmstxt(llmsData);

  return new Response(llmstxt, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
};

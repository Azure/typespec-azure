import { generateLlmstxtFull } from "@typespec/astro-utils/llmstxt";
import type { APIRoute } from "astro";
import { collectLlmsDocs } from "../../utils/llmstxt";

export const GET: APIRoute = async () => {
  const { docs } = await collectLlmsDocs();
  // Sort docs so that subjects are grouped together based on their paths
  docs.sort((a, b) => (a.id > b.id ? 1 : -1));

  const llmstxt = generateLlmstxtFull("TypeSpec Azure Documentation", docs);

  return new Response(llmstxt, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
};

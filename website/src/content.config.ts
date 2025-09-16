import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { llmstxtSchema } from "@typespec/astro-utils/llmstxt/schema";
import { defineCollection, z } from "astro:content";

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({ extend: z.object({ llmstxt: llmstxtSchema.optional() }) }),
  }),
};

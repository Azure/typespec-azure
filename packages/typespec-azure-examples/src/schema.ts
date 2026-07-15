/**
 * Loads the JSON Schema generated from `schema/examples-yaml.tsp`. The generated module lives
 * outside `src`, so we resolve it relative to the compiled output first and fall back to the
 * source-relative path when running from `src` (e.g. under vitest).
 */
let ExamplesYamlSchema: any;
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - generated at build time by `regen-examples-yaml-schema`
  ExamplesYamlSchema = (await import("../../schema/dist/schema.js")).default;
} catch {
  const name = "../schema/dist/schema.js";
  ExamplesYamlSchema = (await import(/* @vite-ignore */ name)).default;
}

export { ExamplesYamlSchema };

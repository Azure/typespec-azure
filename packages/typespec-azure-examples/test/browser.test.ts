import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { assert, expect, it } from "vitest";

it("bundles and runs the public API without Node.js globals or polyfills", async () => {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL("../src/index.ts", import.meta.url))],
    bundle: true,
    platform: "browser",
    format: "iife",
    globalName: "examples",
    write: false,
    logLevel: "silent",
  });
  const context: { examples?: typeof import("../src/index.js") } = {};
  runInNewContext(bundle.outputFiles[0].text, context);
  assert(context.examples);
  const {
    deriveOperationKey,
    loadExampleFile,
    materializeLegacyExample,
    resolveExampleFiles,
    validateExampleFiles,
  } = context.examples;

  const file = loadExampleFile(
    "examples.yaml",
    `
Widgets.get:
  - request:
      path: { name: widget }
    responses:
      200:
        body: { nextLink: "https://example.com?api-version={api-version}" }
`,
  );
  expect(validateExampleFiles([file])).toEqual([]);
  const resolved = resolveExampleFiles([file], "2024-06-01", ["2024-06-01"]);
  expect(resolved.diagnostics).toEqual([]);
  expect(resolved.examples).toHaveLength(1);
  expect(deriveOperationKey("Widgets_Get")).toBe("Widgets.get");
  expect(
    materializeLegacyExample(resolved.examples[0], {
      operationId: "Widgets_Get",
      apiVersion: "2024-06-01",
    }),
  ).toEqual({
    title: "Widgets_Get",
    operationId: "Widgets_Get",
    parameters: { name: "widget", "api-version": "2024-06-01" },
    responses: {
      "200": { body: { nextLink: "https://example.com?api-version=2024-06-01" } },
    },
  });
  expect(context.examples).not.toHaveProperty("discoverExampleFiles");
  expect(context.examples).not.toHaveProperty("add");
  expect(context.examples).not.toHaveProperty("migrate");
  expect(context.examples).not.toHaveProperty("resolveExamplesDir");
});

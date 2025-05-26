import { context } from "esbuild";

// Build the extension
const nodeContext = await context({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/src/extension.js",
  platform: "node",
  mainFields: ["module", "main"], // app insights web https://www.npmjs.com/package/@microsoft/applicationinsights-web-basic uses module instead of exports...
  target: "node22",
  format: "esm",
  sourcemap: true,
  external: ["vscode"],
});


if (process.argv.includes("--watch")) {
  console.log("Watching for changes...");
  // Watch the extension
  await Promise.all([nodeContext.watch()]);
} else {
  console.log("Building...");

  // Watch the extension
  await nodeContext.rebuild();
  nodeContext.dispose();
}

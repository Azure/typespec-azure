import { readFile } from "node:fs/promises";
import type { Plugin } from "vite";

export function javaWasmPoc(): Plugin {
  const prefix = "libs/@azure-tools/typespec-java/java-wasm/";
  const assets = new Map<string, { content: Buffer; contentType: string }>();
  return {
    name: "java-wasm-poc",
    async buildStart() {
      for (const name of ["worker.js", "runtime.js", "generator.wasm"]) {
        const path = new URL(`../typespec-java/dist/browser/java-wasm/${name}`, import.meta.url);
        assets.set(name, {
          content: await readFile(path),
          contentType: name.endsWith(".wasm") ? "application/wasm" : "text/javascript",
        });
      }
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url?.split("?")[0];
        const asset = url?.startsWith(`/${prefix}`)
          ? assets.get(url.slice(prefix.length + 1))
          : undefined;
        if (!asset) return next();
        response.writeHead(200, { "Content-Type": asset.contentType });
        response.end(asset.content);
      });
    },
    generateBundle() {
      for (const [name, asset] of assets) {
        this.emitFile({ type: "asset", fileName: prefix + name, source: asset.content });
      }
    },
  };
}

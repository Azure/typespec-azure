import { definePlaygroundViteConfig } from "@typespec/playground/vite";
import { defineConfig, loadEnv } from "vite";
import { TypeSpecPlaygroundConfig } from "./src/index.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const useLocalLibraries = env["VITE_USE_LOCAL_LIBRARIES"] === "true";
  const config = definePlaygroundViteConfig({
    ...TypeSpecPlaygroundConfig,
    libraries: TypeSpecPlaygroundConfig.libraries.filter(
      (library) =>
        !TypeSpecPlaygroundConfig.deferredEmitters.some((emitter) => emitter === library),
    ),
    links: {
      documentationUrl: "https://azure.github.io/typespec-azure",
    },
    skipBundleLibraries: !useLocalLibraries,
  });
  config.plugins!.push({
    name: "import-map-shim",
    transformIndexHtml: {
      order: "post",
      // `importShim.addImportMap` requires shim mode, which ignores native import maps.
      handler: (html) =>
        html.replace('<script type="importmap">', '<script type="importmap-shim">'),
    },
  });
  return config;
});

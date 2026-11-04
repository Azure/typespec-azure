import { definePlaygroundViteConfig } from "@typespec/playground/vite";
import { defineConfig, loadEnv } from "vite";
import { TypeSpecPlaygroundConfig } from "./src/index.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const useLocalLibraries = env["VITE_USE_LOCAL_LIBRARIES"] === "true";
  const config = definePlaygroundViteConfig({
    ...TypeSpecPlaygroundConfig,
    links: {
      documentationUrl: "https://azure.github.io/typespec-azure",
    },
    skipBundleLibraries: !useLocalLibraries,
  });
  config.plugins?.push({
    name: "azure-playground-import-map-shim",
    transformIndexHtml: {
      order: "post",
      handler: (html) =>
        // Remote import maps enable shim mode, which must also see the local library map.
        html.replace('<script type="importmap">', '<script type="importmap-shim">'),
    },
  });
  return config;
});

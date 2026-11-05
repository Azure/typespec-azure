import { definePlaygroundViteConfig } from "@typespec/playground/vite";
import { defineConfig, loadEnv } from "vite";
import { TypeSpecPlaygroundConfig } from "./src/index.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const useLocalLibraries = env["VITE_USE_LOCAL_LIBRARIES"] === "true";
  return definePlaygroundViteConfig({
    ...TypeSpecPlaygroundConfig,
    links: {
      documentationUrl: "https://azure.github.io/typespec-azure",
    },
    skipBundleLibraries: !useLocalLibraries,
  });
});

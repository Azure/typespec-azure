import { definePlaygroundViteConfig } from "@typespec/playground/vite";
import { defineConfig, loadEnv } from "vite";
import { javaWasmPoc } from "./java-wasm-poc.js";
import { TypeSpecPlaygroundConfig } from "./src/index.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const enableJavaWasmPoc = env["VITE_JAVA_WASM_POC"] === "true";
  const useLocalLibraries = env["VITE_USE_LOCAL_LIBRARIES"] === "true" || enableJavaWasmPoc;
  const config = definePlaygroundViteConfig({
    ...TypeSpecPlaygroundConfig,
    libraries: enableJavaWasmPoc
      ? [...TypeSpecPlaygroundConfig.libraries, "@azure-tools/typespec-java"]
      : TypeSpecPlaygroundConfig.libraries,
    links: {
      documentationUrl: "https://azure.github.io/typespec-azure",
    },
    skipBundleLibraries: !useLocalLibraries,
  });
  if (enableJavaWasmPoc) config.plugins!.push(javaWasmPoc());
  return config;
});

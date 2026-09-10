import { resolve } from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";
import { defaultTypeSpecVitestConfig } from "../../core/vitest.config";

export default mergeConfig(
  defaultTypeSpecVitestConfig,
  defineConfig({
    resolve: {
      alias: {
        "@typespec/emitter-framework": resolve(
          import.meta.dirname,
          "../../core/packages/emitter-framework/dist/src/core/index.js",
        ),
      },
    },
  }),
);

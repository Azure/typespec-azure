import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "azure-samples",
    environment: "node",
    testTimeout: 30000,
    isolate: false,
    coverage: {
      reporter: ["cobertura", "json", "text"],
    },
    outputFile: {
      junit: "./test-results.xml",
    },
  },
});

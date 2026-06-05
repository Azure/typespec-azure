import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "test-next",
          include: ["test-next/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "unit-rlc",
          include: ["test/unit/**/*.test.ts"],
          testTimeout: 36000,
        },
      },
      {
        test: {
          name: "unit-modular",
          include: ["test/modular-unit/**/*.test.ts"],
          testTimeout: 0,
          pool: "forks",
          poolOptions: {
            forks: {
              execArgv: ["--max-old-space-size=8192"],
            },
          },
        },
      },
      {
        test: {
          name: "integration-rlc",
          include: ["test/integration/*.test.ts"],
          exclude: ["test/integration/versioningRemoved.test.ts"],
          testTimeout: 36000,
        },
      },
      {
        test: {
          name: "integration-azure-rlc",
          include: ["test/azure-integration/*.test.ts"],
          exclude: [
            "test/azure-integration/versioningRemoved.test.ts",
            "test/azure-integration/azureClientGeneratorCoreClientInitialization.test.ts",
          ],
          testTimeout: 36000,
        },
      },
      {
        test: {
          name: "integration-modular",
          include: ["test/modular-integration/*.test.ts"],
          testTimeout: 36000,
        },
      },
      {
        test: {
          name: "integration-azure-modular",
          include: ["test/azure-modular-integration/*.test.ts"],
          exclude: [
            "test/azure-modular-integration/clientStructureOperationGroup.test.ts",
            "test/azure-modular-integration/clientStructureRenamed.test.ts",
            "test/azure-modular-integration/clientStructureTwoGroup.test.ts",
            "test/azure-modular-integration/payloadMultipart.test.ts",
          ],
          testTimeout: 36000,
        },
      },
    ],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      include: [
        "src/modular/serialization/**/*.ts",
        "src/framework/**/*.ts",
        "static/static-helpers/**/*.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.test.tsx", ".next/*"],
    },
  },
});

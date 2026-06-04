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
          include: ["test/modularUnit/**/*.test.ts"],
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
          include: ["test/azureIntegration/*.test.ts"],
          exclude: [
            "test/azureIntegration/versioningRemoved.test.ts",
            "test/azureIntegration/azureClientGeneratorCoreClientInitialization.test.ts",
          ],
          testTimeout: 36000,
        },
      },
      {
        test: {
          name: "integration-modular",
          include: ["test/modularIntegration/*.test.ts"],
          testTimeout: 36000,
        },
      },
      {
        test: {
          name: "integration-azure-modular",
          include: ["test/azureModularIntegration/*.test.ts"],
          exclude: [
            "test/azureModularIntegration/clientStructureOperationGroup.test.ts",
            "test/azureModularIntegration/clientStructureRenamed.test.ts",
            "test/azureModularIntegration/clientStructureTwoGroup.test.ts",
            "test/azureModularIntegration/payloadMultipart.test.ts",
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

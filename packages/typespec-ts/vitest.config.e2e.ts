import { defineConfig, mergeConfig } from "vitest/config";
import { defaultTypeSpecVitestConfig } from "../../core/vitest.config.js";

export default mergeConfig(defaultTypeSpecVitestConfig, defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "integration-rlc",
          include: ["test/integration/*.spec.ts"],
          exclude: ["test/integration/versioningRemoved.spec.ts"],
          testTimeout: 36000,
        },
      },
      {
        test: {
          name: "integration-azure-rlc",
          include: ["test/azureIntegration/*.spec.ts"],
          exclude: [
            "test/azureIntegration/versioningRemoved.spec.ts",
            "test/azureIntegration/azureClientGeneratorCoreClientInitialization.spec.ts",
          ],
          testTimeout: 36000,
        },
      },
      {
        test: {
          name: "integration-modular",
          include: ["test/modularIntegration/*.spec.ts"],
          testTimeout: 36000,
        },
      },
      {
        test: {
          name: "integration-azure-modular",
          include: ["test/azureModularIntegration/*.spec.ts"],
          exclude: [
            "test/azureModularIntegration/clientStructureOperationGroup.spec.ts",
            "test/azureModularIntegration/clientStructureRenamed.spec.ts",
            "test/azureModularIntegration/clientStructureTwoGroup.spec.ts",
            "test/azureModularIntegration/payloadMultipart.spec.ts",
          ],
          testTimeout: 36000,
        },
      },
    ],
  },
}));

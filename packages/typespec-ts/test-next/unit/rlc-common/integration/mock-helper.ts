import {
  buildRuntimeImports,
  initInternalImports,
} from "../../../../src/utils/imports-util.js";
import { RLCModel } from "../../../../src/interfaces.js";

export type TestModelConfig = {
  description?: string;
  withTests?: boolean;
  withSamples?: boolean;
  libraryName?: string;
  version?: string;
  srcPath?: string;
  monorepoPackageDirectory?: string;
  hasLro?: boolean;
  hasPaging?: boolean;
  isModularLibrary?: boolean;
  azureArm?: boolean;
  hasSubscriptionId?: boolean;
  addCredentials?: boolean;
  scopeName?: string;
  generateReactNativeTarget?: boolean;
};

export function createMockModel(config: TestModelConfig = {}): RLCModel {
  return {
    importInfo: {
      runtimeImports: buildRuntimeImports(),
      internalImports: initInternalImports(),
    },
    libraryName: config.libraryName ?? "@msinternal/test",
    // Package json file generation doesn't need paths information
    paths: {},
    // Package json file generation doesn't need schemas information
    schemas: [],
    srcPath: config.srcPath ?? "src",
    options: {
      azureOutputDirectory: config.monorepoPackageDirectory,
      packageDetails: {
        name: config.libraryName ?? "@msinternal/test",
        version: config.version ?? "1.0.0",
        description: config.description ?? "A test package",
        nameWithoutScope: "test",
        scopeName: config.scopeName ?? "msinternal",
      },
      generateTest: config.withTests ?? false,
      generateSample: config.withSamples ?? false,
      isModularLibrary: config.isModularLibrary ?? false,
      azureArm: config.azureArm ?? false,
      hasSubscriptionId: config.hasSubscriptionId ?? false,
      addCredentials: config.addCredentials ?? false,
      generateReactNativeTarget: config.generateReactNativeTarget ?? false,
    },
    helperDetails: {
      hasPaging: config.hasPaging ?? false,
      hasLongRunning: config.hasLro ?? false,
    },
  };
}

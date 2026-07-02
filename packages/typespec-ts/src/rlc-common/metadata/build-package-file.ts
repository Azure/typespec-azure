// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Project, SourceFile } from "ts-morph";
import { hasPollingOperations } from "../helpers/operation-helpers.js";
import { RLCModel } from "../interfaces.js";
import { buildAzureMonorepoPackage } from "./package-json/build-azure-monorepo-package.js";
import { PackageCommonInfoConfig, resolveWarpExports } from "./package-json/package-common.js";
import { getPackageName } from "./utils.js";

interface PackageFileOptions {
  exports?: Record<string, any>;
  dependencies?: Record<string, string>;
  clientContextPaths?: string[];
}

export function buildPackageFile(
  model: RLCModel,
  { exports, dependencies, clientContextPaths }: PackageFileOptions = {},
) {
  const config: PackageCommonInfoConfig = {
    description: getDescription(model),
    name: getPackageName(model),
    version: getPackageVersion(model),
    withSamples: model.options?.generateSample === true,
    withTests: model.options?.generateTest === true,
    nameWithoutScope: model.options?.packageDetails?.nameWithoutScope,
    exports,
    azureArm: model.options?.azureArm,
    generateReactNativeTarget: model.options?.generateReactNativeTarget,
  };

  const extendedConfig = {
    ...config,
    hasLro: hasPollingOperations(model),
    monorepoPackageDirectory: model.options?.azureOutputDirectory,
    dependencies,
    clientContextPaths,
  };

  const packageInfo: Record<string, any> = buildAzureMonorepoPackage(extendedConfig);

  const project = new Project({ useInMemoryFileSystem: true });
  const filePath = "package.json";

  if (!packageInfo) {
    return;
  }

  const packageFile = project.createSourceFile(filePath, JSON.stringify(packageInfo, null, 2), {
    overwrite: true,
  });
  return {
    path: filePath,
    content: packageFile.getFullText(),
  };
}

/**
 * Automatically updates the package.json for an existing Azure SDK package.
 * - Migrates `@azure/core-client` → `@azure-rest/core-client` when found in dependencies.
 * - Updates `@azure/core-lro` from `^2.x` to `^3.1.0`.
 * - Adds LRO dependencies (`@azure/core-lro`, `@azure/abort-controller`) when the package has
 *   polling operations (for non-monorepo Azure packages).
 * - Updates exports (tshy or warp) when `exports` is provided.
 * - Updates `//metadata.constantPaths` when `clientContextPaths` is provided.
 */
export function updatePackageFile(
  model: RLCModel,
  existingFilePathOrContent: string | Record<string, any>,
  { exports, clientContextPaths }: PackageFileOptions = {},
) {
  const hasLro = hasPollingOperations(model);
  const needsLroUpdate = hasLro;
  const needsExportsUpdate = exports;
  const needsConstantPathsUpdate = clientContextPaths && clientContextPaths.length > 0;

  let packageInfo;
  if (typeof existingFilePathOrContent === "string") {
    let packageFile: SourceFile;
    try {
      const project = new Project();
      packageFile = project.addSourceFileAtPath(existingFilePathOrContent);
    } catch (_e) {
      // If the file doesn't exist, we don't need to update it.
      return;
    }
    packageInfo = JSON.parse(packageFile.getFullText());
  } else {
    packageInfo = existingFilePathOrContent;
  }

  // Migrate AutoRest-specific dependency names and versions to their TypeSpec equivalents.
  const deps: Record<string, string> = { ...(packageInfo.dependencies ?? {}) };
  let needsCoreClientUpdate = false;

  // @azure/core-client is AutoRest-only; TypeSpec uses @azure-rest/core-client.
  if ("@azure/core-client" in deps) {
    needsCoreClientUpdate = true;
  }

  // Ensure warp packages have #platform/* imports for polyfill resolution.
  // The `react-native` condition is only added when explicitly opted in via
  // `generateReactNativeTarget`, matching the fresh-generation path in
  // `getEsmEntrypointInformation` (packageCommon.ts).
  const platformImports: Record<string, string> = {
    browser: "./src/*-browser.mts",
    default: "./src/*.ts",
  };
  if (model.options?.generateReactNativeTarget) {
    // Insert `react-native` before `default` so Node's conditional
    // resolution order matches the fresh-generation output.
    packageInfo.imports = {
      "#platform/*": {
        browser: platformImports["browser"],
        "react-native": "./src/*-react-native.mts",
        default: platformImports["default"],
      },
    };
  } else {
    packageInfo.imports = {
      "#platform/*": platformImports,
    };
  }

  // Update exports (warp: resolved exports in package.json)
  if (needsExportsUpdate) {
    packageInfo.exports = resolveWarpExports(exports, model.options?.generateReactNativeTarget);
  }

  // Update Core Client dependency
  if (needsCoreClientUpdate) {
    delete deps["@azure/core-client"];
    packageInfo.dependencies = deps;
  }

  // Update LRO dependencies for Azure packages
  if (needsLroUpdate) {
    packageInfo.dependencies = {
      ...packageInfo.dependencies,
      "@azure/core-lro": "^3.1.0",
      "@azure/abort-controller": "^2.1.2",
    };
  }

  // Update constantPaths metadata for Azure packages
  if (needsConstantPathsUpdate && packageInfo["//metadata"]) {
    const metadata = packageInfo["//metadata"];
    // Filter out existing userAgentInfo entries
    const nonUserAgentPaths = (metadata.constantPaths || []).filter(
      (item: any) => item.prefix !== "userAgentInfo",
    );
    // Add new userAgentInfo entries from clientContextPaths
    const newUserAgentPaths = clientContextPaths!.map((path) => ({
      path: path,
      prefix: "userAgentInfo",
    }));
    metadata.constantPaths = [...nonUserAgentPaths, ...newUserAgentPaths];
  }

  // Always update @azure/core-rest-pipeline and @azure-rest/core-client to the latest
  // versions because our imports rely on APIs from those latest package versions.
  packageInfo.dependencies = {
    ...packageInfo.dependencies,
    "@azure/core-rest-pipeline": "^1.24.0",
    "@azure-rest/core-client": "^2.7.0",
  };

  return {
    path: "package.json",
    content: JSON.stringify(packageInfo, null, 2),
  };
}

function getPackageVersion(model: RLCModel): string {
  return model.options?.packageDetails?.version ?? "1.0.0-beta.1";
}

function getDescription(model: RLCModel): string {
  const description = model.options?.packageDetails?.description;
  if (!description) {
    return `A generated SDK for ${model.libraryName}.`;
  }
  return description;
}

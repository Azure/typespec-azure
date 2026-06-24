// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export interface PackageCommonInfoConfig {
  name: string;
  nameWithoutScope?: string;
  version: string;
  description: string;
  withTests: boolean;
  withSamples: boolean;
  exports?: Record<string, any>;
  dependencies?: Record<string, string>;
  azureArm?: boolean;
  isModularLibrary?: boolean;
  /**
   * When true, generates React Native build targets (dist/react-native, exports condition).
   * Defaults to false.
   */
  generateReactNativeTarget?: boolean;
}

/**
 * Common package.json config for a package.
 */
export function getPackageCommonInfo(config: PackageCommonInfoConfig) {
  const { name, version, description } = config;

  return {
    name,
    version,
    description,
    engines: {
      node: ">=22.0.0",
    },
    sideEffects: false,
    autoPublish: false,
    ...getEntryPointInformation(config),
  };
}

function getEntryPointInformation(config: PackageCommonInfoConfig) {
  // Azure monorepo packages use warp.
  const result: Record<string, any> = {
    type: "module",
    main: "./dist/commonjs/index.js",
    module: "./dist/esm/index.js",
    types: "./dist/commonjs/index.d.ts",
    browser: "./dist/browser/index.js",
    imports: {
      "#platform/*": {
        browser: "./src/*-browser.mts",
        default: "./src/*.ts",
      } as Record<string, string>,
    },
    exports: resolveWarpExports(config.exports, config.generateReactNativeTarget),
  };

  if (config.generateReactNativeTarget) {
    result["react-native"] = "./dist/react-native/index.js";
    (result["imports"]["#platform/*"] as Record<string, string>)["react-native"] =
      "./src/*-react-native.mts";
    // Reorder so react-native comes before default
    const importsEntry = result["imports"]["#platform/*"] as Record<string, string>;
    result["imports"]["#platform/*"] = {
      browser: importsEntry["browser"],
      "react-native": importsEntry["react-native"],
      default: importsEntry["default"],
    };
  }

  return result;
}

/**
 * Resolve source-level exports to dist-level exports for warp.
 * Converts { ".": "./src/index.ts" } to the nested condition map with
 * browser/import/require conditions pointing to dist/ paths.
 */
export function resolveWarpExports(
  sourceExports?: Record<string, any>,
  includeReactNative?: boolean,
): Record<string, any> {
  const exports: Record<string, any> = {};
  const allExports: Record<string, string> = {
    "./package.json": "./package.json",
    ".": "./src/index.ts",
    ...sourceExports,
  };

  for (const [subpath, sourcePath] of Object.entries(allExports)) {
    // Pass-through entries (e.g. "./package.json": "./package.json")
    if (!/\.ts$/.test(sourcePath)) {
      exports[subpath] = sourcePath;
      continue;
    }

    // Convert source path to dist path: "./src/foo/index.ts" -> "foo/index"
    const relPath = sourcePath.replace(/^\.\/src\//, "").replace(/\.ts$/, "");

    const exportEntry: Record<string, any> = {
      browser: {
        types: `./dist/browser/${relPath}.d.ts`,
        default: `./dist/browser/${relPath}.js`,
      },
    };

    if (includeReactNative) {
      exportEntry["react-native"] = {
        types: `./dist/react-native/${relPath}.d.ts`,
        default: `./dist/react-native/${relPath}.js`,
      };
    }

    exportEntry["import"] = {
      types: `./dist/esm/${relPath}.d.ts`,
      default: `./dist/esm/${relPath}.js`,
    };

    exportEntry["require"] = {
      types: `./dist/commonjs/${relPath}.d.ts`,
      default: `./dist/commonjs/${relPath}.js`,
    };

    exports[subpath] = exportEntry;
  }

  return exports;
}

export function getCommonPackageScripts() {
  return {
    clean: "rimraf --glob dist dist-browser dist-esm test-dist temp types *.tgz *.log",
    "extract-api": "rimraf review && mkdirp ./review && api-extractor run --local",
    pack: "npm pack 2>&1",
    lint: "eslint package.json api-extractor.json src",
    "lint:fix": "eslint package.json api-extractor.json src --fix --fix-type [problem,suggestion]",
  };
}

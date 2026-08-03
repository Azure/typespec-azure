// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Project } from "ts-morph";
import { ClientModel } from "../interfaces.js";

/**
 * Builds the root tsconfig.json.
 *
 * Emits project references pointing into the `config/` subfolder
 * (following the eng/tsconfigs pattern).
 */
export function buildTsConfig(model: ClientModel) {
  const { generateTest, generateSample, generateReactNativeTarget } = model.options || {};
  const project = new Project({ useInMemoryFileSystem: true });

  const references: { path: string }[] = [
    { path: "./config/tsconfig.src.esm.json" },
    { path: "./config/tsconfig.src.browser.json" },
  ];

  if (generateReactNativeTarget) {
    references.push({ path: "./config/tsconfig.src.react-native.json" });
  }

  references.push({ path: "./config/tsconfig.src.cjs.json" });

  if (generateTest) {
    references.push(
      { path: "./config/tsconfig.test.node.json" },
      { path: "./config/tsconfig.test.browser.json" },
    );
  }

  if (generateSample) {
    references.push({ path: "./config/tsconfig.samples.json" });
  }

  if (generateTest) {
    references.push({ path: "./config/tsconfig.snippets.json" });
  }

  const tsConfig = { references, files: [] };

  const filePath = "tsconfig.json";
  const configFile = project.createSourceFile(filePath, JSON.stringify(tsConfig, null, 2), {
    overwrite: true,
  });
  return {
    path: filePath,
    content: configFile.getFullText(),
  };
}

/**
 * Derives the tsconfig `include` list from the warp `exports` map so every
 * exported client entry point is compiled and emitted to `dist`; if they drift
 * out of sync, warp fails the build with `DIST_MISSING`. Root index is the fallback.
 */
export function getSrcIncludePaths(exports?: Record<string, string>): string[] {
  const includes = new Set<string>(["../src/index.ts"]);
  if (exports) {
    for (const value of Object.values(exports)) {
      if (typeof value === "string" && value.endsWith(".ts")) {
        includes.add(value.replace(/^\.\//, "../"));
      }
    }
  }
  return Array.from(includes);
}

/**
 * Builds config/tsconfig.src.esm.json — extends eng/tsconfigs/src.esm.json
 */
export function buildTsSrcEsmConfig(exports?: Record<string, string>) {
  return {
    path: "config/tsconfig.src.esm.json",
    content: JSON.stringify(
      {
        extends: "../../../../eng/tsconfigs/src.esm.json",
        compilerOptions: {
          resolveJsonModule: true,
        },
        include: getSrcIncludePaths(exports),
      },
      null,
      2,
    ),
  };
}

/**
 * Builds config/tsconfig.src.browser.json — extends eng/tsconfigs/src.browser.json
 */
export function buildTsSrcBrowserConfig(exports?: Record<string, string>) {
  return {
    path: "config/tsconfig.src.browser.json",
    content: JSON.stringify(
      {
        extends: "../../../../eng/tsconfigs/src.browser.json",
        compilerOptions: {
          resolveJsonModule: true,
        },
        include: getSrcIncludePaths(exports),
      },
      null,
      2,
    ),
  };
}

/**
 * Builds config/tsconfig.src.react-native.json — extends eng/tsconfigs/src.react-native.json
 */
export function buildTsSrcReactNativeConfig(exports?: Record<string, string>) {
  return {
    path: "config/tsconfig.src.react-native.json",
    content: JSON.stringify(
      {
        extends: "../../../../eng/tsconfigs/src.react-native.json",
        compilerOptions: {
          resolveJsonModule: true,
        },
        include: getSrcIncludePaths(exports),
      },
      null,
      2,
    ),
  };
}

/**
 * Builds config/tsconfig.src.cjs.json — extends eng/tsconfigs/src.cjs.json
 */
export function buildTsSrcCjsConfig(exports?: Record<string, string>) {
  return {
    path: "config/tsconfig.src.cjs.json",
    content: JSON.stringify(
      {
        extends: "../../../../eng/tsconfigs/src.cjs.json",
        compilerOptions: {
          resolveJsonModule: true,
        },
        include: getSrcIncludePaths(exports),
      },
      null,
      2,
    ),
  };
}

/**
 * Builds config/tsconfig.samples.json — extends eng/tsconfigs/samples.json
 */
export function buildTsSampleConfig(model: ClientModel) {
  const { packageDetails } = model.options || {};
  const clientPackageName = packageDetails?.name ?? "";
  return {
    path: "config/tsconfig.samples.json",
    content: JSON.stringify(
      {
        extends: "../../../../eng/tsconfigs/samples.json",
        compilerOptions: {
          paths: {
            [clientPackageName]: ["../dist/esm"],
          },
        },
      },
      null,
      2,
    ),
  };
}

/**
 * Builds config/tsconfig.lint.json — used by eslint.config.mjs for type-aware linting
 */
export function buildTsLintConfig() {
  return {
    path: "config/tsconfig.lint.json",
    content: JSON.stringify(
      {
        extends: "../../../../tsconfig.json",
        include: ["../src", "../test"],
      },
      null,
      2,
    ),
  };
}

/**
 * Builds config/tsconfig.snippets.json — extends eng/tsconfigs/snippets.json
 */
export function buildTsSnippetsConfig() {
  return {
    path: "config/tsconfig.snippets.json",
    content: JSON.stringify(
      {
        extends: "../../../../eng/tsconfigs/snippets.json",
      },
      null,
      2,
    ),
  };
}

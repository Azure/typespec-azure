// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, expect, it } from "vitest";

import {
  buildTsSrcBrowserConfig,
  buildTsSrcCjsConfig,
  buildTsSrcEsmConfig,
  buildTsSrcReactNativeConfig,
  getSrcIncludePaths,
} from "../../../src/metadata/build-ts-config.js";

describe("tsconfig.src.*.json include generation", () => {
  it("defaults to the root entry point when no exports are provided", () => {
    expect(getSrcIncludePaths()).toEqual(["../src/index.ts"]);
    expect(getSrcIncludePaths({})).toEqual(["../src/index.ts"]);
  });

  it("keeps the include list in sync with the warp exports for multi-client packages", () => {
    // Mirrors the exports map produced for a multi-client package.
    const exports = {
      ".": "./src/index.ts",
      "./devCenter": "./src/devCenter/index.ts",
      "./devCenter/api": "./src/devCenter/api/index.ts",
      "./devBoxes": "./src/devBoxes/index.ts",
      "./devBoxes/api": "./src/devBoxes/api/index.ts",
      "./deploymentEnvironments": "./src/deploymentEnvironments/index.ts",
      "./deploymentEnvironments/api": "./src/deploymentEnvironments/api/index.ts",
      "./models": "./src/models/index.ts",
    };

    const include = getSrcIncludePaths(exports);

    // Every per-client barrel must be a compilation input so it is emitted to dist.
    expect(include).toContain("../src/index.ts");
    expect(include).toContain("../src/devCenter/index.ts");
    expect(include).toContain("../src/devBoxes/index.ts");
    expect(include).toContain("../src/deploymentEnvironments/index.ts");
    // The deeper api/model barrels are exported too, so they are included as well.
    expect(include).toContain("../src/devCenter/api/index.ts");
    expect(include).toContain("../src/models/index.ts");
  });

  it("ignores non-TypeScript export values (e.g. package.json)", () => {
    const include = getSrcIncludePaths({
      "./package.json": "./package.json",
      ".": "./src/index.ts",
    });
    expect(include).toEqual(["../src/index.ts"]);
  });

  it("does not emit duplicate include entries", () => {
    const include = getSrcIncludePaths({
      ".": "./src/index.ts",
      "./alias": "./src/index.ts",
    });
    expect(include).toEqual(["../src/index.ts"]);
  });

  it("propagates the exports into each per-target tsconfig", () => {
    const exports = {
      ".": "./src/index.ts",
      "./devCenter": "./src/devCenter/index.ts",
    };

    for (const build of [
      buildTsSrcEsmConfig,
      buildTsSrcBrowserConfig,
      buildTsSrcReactNativeConfig,
      buildTsSrcCjsConfig,
    ]) {
      const result = build(exports);
      const parsed = JSON.parse(result.content);
      expect(parsed.include).toEqual(["../src/index.ts", "../src/devCenter/index.ts"]);
    }
  });
});

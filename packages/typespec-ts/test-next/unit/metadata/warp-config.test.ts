// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, expect, it } from "vitest";

import { buildWarpConfig } from "../../../src/metadata/build-warp-config.js";
import { createMockModel } from "./mock-helper.js";

describe("warp.config.yml generation", () => {
  it("should generate a self-contained config without polyfillSuffix and without react-native by default", () => {
    const model = createMockModel({});

    const result = buildWarpConfig(model);
    expect(result).toBeDefined();
    expect(result!.path).toBe("warp.config.yml");
    expect(result!.content).not.toContain("extends:");
    // polyfillSuffix is no longer used — polyfill resolution is handled
    // via package.json subpath imports instead.
    expect(result!.content).not.toContain("polyfillSuffix");
    // Default: three targets without react-native
    expect(result!.content).toContain("name: browser");
    expect(result!.content).not.toContain("name: react-native");
    expect(result!.content).toContain("name: esm");
    expect(result!.content).toContain("name: commonjs");
    expect(result!.content).toContain("tsconfig:");
    // Base exports should be included
    expect(result!.content).toContain('"./package.json"');
    expect(result!.content).toContain('"."');
  });

  it("should include react-native target when generateReactNativeTarget is true", () => {
    const model = createMockModel({
      generateReactNativeTarget: true,
    });

    const result = buildWarpConfig(model);
    expect(result).toBeDefined();
    expect(result!.content).toContain("name: browser");
    expect(result!.content).toContain("name: react-native");
    expect(result!.content).toContain("name: esm");
    expect(result!.content).toContain("name: commonjs");
  });

  it("should include custom exports alongside base exports", () => {
    const model = createMockModel({});

    const result = buildWarpConfig(model, {
      exports: {
        ".": "./src/index.ts",
        "./models": "./src/models/index.ts",
      },
    });
    expect(result).toBeDefined();
    expect(result!.content).not.toContain("extends:");
    expect(result!.content).not.toContain("polyfillSuffix");
    expect(result!.content).toContain("./models");
    expect(result!.content).toContain("./package.json");
    expect(result!.content).toContain("moduleType: commonjs");
  });
});

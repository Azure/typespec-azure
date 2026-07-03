// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, expect, it } from "vitest";

import { buildPackageFile, updatePackageFile } from "../../../src/metadata/build-package-file.js";
import { TestModelConfig, createMockModel } from "./mock-helper.js";

describe("Package file generation", () => {
  describe("Azure SDK for JS Monorepo", () => {
    const libraryName = "test";
    const version = "1.0.0";
    const description = "Test description";

    const baseConfig: TestModelConfig = {
      libraryName,
      version,
      description,
    };

    it("should create a package file with repo info", () => {
      const model = createMockModel({
        ...baseConfig,
        monorepoPackageDirectory: "test",
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile).to.have.property("sdk-type", "client");
      expect(packageFile).to.have.property("repository");
      expect(packageFile.repository).toEqual({
        type: "git",
        url: "git+https://github.com/Azure/azure-sdk-for-js",
        directory: "test",
      });
      expect(packageFile).to.have.property("bugs");
      expect(packageFile.bugs).to.have.property(
        "url",
        "https://github.com/Azure/azure-sdk-for-js/issues",
      );
      expect(packageFile).to.have.property(
        "homepage",
        `https://github.com/Azure/azure-sdk-for-js/tree/main/test/README.md`,
      );
      expect(packageFile).to.have.property(
        "prettier",
        "@azure/eslint-plugin-azure-sdk/prettier.json",
      );
    });

    it("should set a default repository directory when package directory is unavailable", () => {
      const model = createMockModel({
        ...baseConfig,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile).to.have.property("repository");
      expect(packageFile.repository).toEqual({
        type: "git",
        url: "git+https://github.com/Azure/azure-sdk-for-js",
        directory: "sdk/",
      });
    });

    it("should have monorepo metadata", () => {
      const model = createMockModel({ ...baseConfig });
      const packageFileContent = buildPackageFile(model, {
        clientContextPaths: ["src/api/testContext.ts"],
      });
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      const expectedMetadata = {
        constantPaths: [
          {
            path: "src/api/testContext.ts",
            prefix: "userAgentInfo",
          },
        ],
      };

      // Verify monorepo specific metadata
      expect(packageFile).to.have.property("//metadata");
      expect(packageFile["//metadata"]).toEqual(expectedMetadata);
    });

    it("should have sample metadata", () => {
      const model = createMockModel({
        ...baseConfig,
        withSamples: true,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      const expectedSampleConfig = {
        productName: `${libraryName}`,
        productSlugs: ["azure"],
        disableDocsMs: true,
        apiRefLink: `https://learn.microsoft.com/javascript/api/${libraryName}`,
      };

      expect(packageFile).to.have.property("//sampleConfiguration");
      expect(packageFile["//sampleConfiguration"]).toEqual(expectedSampleConfig);
    });

    it("should have sample metadata when beta version", () => {
      const model = createMockModel({
        ...baseConfig,
        version: "1.0.0-beta.1",
        withSamples: true,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      const expectedSampleConfig = {
        productName: `${libraryName}`,
        productSlugs: ["azure"],
        disableDocsMs: true,
        apiRefLink: `https://learn.microsoft.com/javascript/api/${libraryName}?view=azure-node-preview`,
      };

      expect(packageFile).to.have.property("//sampleConfiguration");
      expect(packageFile["//sampleConfiguration"]).toEqual(expectedSampleConfig);
    });

    it("[esm] should include correct entrypoints (without react-native by default)", () => {
      const model = createMockModel({
        ...baseConfig,
        withSamples: true,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      // Azure monorepo packages use warp instead of tshy
      expect(packageFile).not.toHaveProperty("tshy");
      expect(packageFile).to.have.property("type", "module");
      expect(packageFile).to.have.property("main", "./dist/commonjs/index.js");
      expect(packageFile).to.have.property("module", "./dist/esm/index.js");
      expect(packageFile).to.have.property("types", "./dist/commonjs/index.d.ts");
      expect(packageFile).to.have.property("browser", "./dist/browser/index.js");
      // Default: no react-native entrypoint
      expect(packageFile).not.toHaveProperty("react-native");
      expect(packageFile).to.have.property("exports");
      expect(packageFile).to.have.property("imports");
      expect(packageFile.imports).toEqual({
        "#platform/*": {
          browser: "./src/*-browser.mts",
          default: "./src/*.ts",
        },
      });
      expect(packageFile.exports["./package.json"]).to.equal("./package.json");
      expect(packageFile.exports["."]).to.have.property("browser");
      // Default: no react-native in exports
      expect(packageFile.exports["."]).not.toHaveProperty("react-native");
      expect(packageFile.exports["."]).to.have.property("import");
      expect(packageFile.exports["."]).to.have.property("require");
      expect(packageFile.exports["."]["import"]).toEqual({
        types: "./dist/esm/index.d.ts",
        default: "./dist/esm/index.js",
      });
    });

    it("[esm] should include react-native entrypoints when generateReactNativeTarget is true", () => {
      const model = createMockModel({
        ...baseConfig,
        withSamples: true,
        generateReactNativeTarget: true,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile).to.have.property("react-native", "./dist/react-native/index.js");
      expect(packageFile).to.have.property("imports");
      expect(packageFile.imports).toEqual({
        "#platform/*": {
          browser: "./src/*-browser.mts",
          "react-native": "./src/*-react-native.mts",
          default: "./src/*.ts",
        },
      });
      expect(packageFile.exports["."]).to.have.property("react-native");
      expect(packageFile.exports["."]["react-native"]).toEqual({
        types: "./dist/react-native/index.d.ts",
        default: "./dist/react-native/index.js",
      });
    });

    it("[esm] should include correct devDependencies", () => {
      const model = createMockModel({
        ...baseConfig,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile.devDependencies).not.toHaveProperty("@vitest/browser-playwright");
      expect(packageFile.devDependencies).not.toHaveProperty("@vitest/coverage-istanbul");
      expect(packageFile.devDependencies).not.toHaveProperty("playwright");
      expect(packageFile.devDependencies).not.toHaveProperty("vitest");
    });

    it("[esm] should include correct devDependencies with tests", () => {
      const model = createMockModel({
        ...baseConfig,
        withTests: true,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile.devDependencies).to.have.property("@vitest/browser-playwright");
      expect(packageFile.devDependencies).to.have.property("@vitest/coverage-istanbul");
      expect(packageFile.devDependencies).to.have.property("playwright");
      expect(packageFile.devDependencies).to.have.property("vitest");
    });

    it("[esm] should include correct scripts with tests", () => {
      const model = createMockModel({
        ...baseConfig,
        withTests: true,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile.scripts).to.have.property(
        "build",
        "npm run clean && dev-tool run build-package && dev-tool run extract-api",
      );
      expect(packageFile.scripts).not.toHaveProperty("test:node:esm");
      expect(packageFile.scripts).to.have.property("test:node", "dev-tool run test:vitest");
      expect(packageFile.scripts).to.have.property(
        "clean",
        "rimraf --glob dist dist-browser dist-esm test-dist temp types *.tgz *.log",
      );
      expect(packageFile.scripts).to.have.property(
        "extract-api",
        "rimraf review && dev-tool run extract-api",
      );
      expect(packageFile.scripts).to.have.property(
        "test:browser",
        "dev-tool run test:vitest --browser",
      );
      expect(packageFile.scripts).to.have.property("pack", "pnpm pack 2>&1");
      expect(packageFile.scripts).to.have.property(
        "test",
        "tsc -b --noEmit && npm run test:node && npm run test:browser",
      );
      expect(packageFile.scripts).to.have.property(
        "format",
        'prettier --write --config ../../../.prettierrc.json --ignore-path ../../../.prettierignore "src/**/*.{ts,cts,mts}" "test/**/*.{ts,cts,mts}" "*.{js,cjs,mjs,json}" ',
      );
    });

    it("[esm] should read clientContextPaths from config for modular", () => {
      const model = createMockModel({
        ...baseConfig,
        isModularLibrary: true,
      });

      const packageFileContent = buildPackageFile(model, {
        clientContextPaths: ["src/api/chatCompletionsContext.ts"],
      });
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");
      expect(packageFile).to.have.property("//metadata");
      expect(packageFile["//metadata"]["constantPaths"][0]).to.have.property(
        "path",
        "src/api/chatCompletionsContext.ts",
        "modular",
      );
    });

    it("should skip lint scripts with arm packages for modular", () => {
      const model = createMockModel({
        ...baseConfig,
        azureArm: true,
        isModularLibrary: true,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile.scripts).to.have.property("lint:fix", "echo skipped");
      expect(packageFile.scripts).to.have.property("lint", "echo skipped");
    });

    it("should include correct build:samples script for ARM packages with samples", () => {
      const model = createMockModel({
        ...baseConfig,
        azureArm: true,
        withSamples: true,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile.scripts).to.have.property(
        "build:samples",
        "tsc -p config/tsconfig.samples.json && dev-tool samples publish -f",
      );
    });

    it("should include correct build:samples script for non-ARM packages with samples", () => {
      const model = createMockModel({
        ...baseConfig,
        azureArm: false,
        withSamples: true,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile.scripts).to.have.property(
        "build:samples",
        "tsc -p config/tsconfig.samples.json",
      );
    });

    it("should skip build:samples script when samples are not enabled", () => {
      const model = createMockModel({
        ...baseConfig,
        azureArm: true,
        withSamples: false,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile.scripts).to.have.property("build:samples", "echo skipped");
    });
    it("[esm] should include correct scripts with pack", () => {
      const model = createMockModel({
        ...baseConfig,
        withTests: true,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile.scripts).to.have.property("pack", "pnpm pack 2>&1");
    });

    it("should include browser but not react-native entrypoints by default", () => {
      const model = createMockModel({
        ...baseConfig,
        azureArm: true,
        isModularLibrary: true,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile).to.have.property("browser", "./dist/browser/index.js");
      // Default: no react-native entrypoint
      expect(packageFile).not.toHaveProperty("react-native");
    });

    it("should include react-native entrypoint when generateReactNativeTarget is true", () => {
      const model = createMockModel({
        ...baseConfig,
        azureArm: true,
        isModularLibrary: true,
        generateReactNativeTarget: true,
      });
      const packageFileContent = buildPackageFile(model);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile).to.have.property("browser", "./dist/browser/index.js");
      expect(packageFile).to.have.property("react-native", "./dist/react-native/index.js");
    });
  });

  describe("updatePackageFile", () => {
    it("should use standard version for LRO dependencies", () => {
      const model = createMockModel({
        hasLro: true,
      });

      const initialPackageInfo = {
        name: "@azure/test-package",
        version: "1.0.0",
        dependencies: {
          "@azure/core-client": "^1.0.0",
        },
      };

      const packageFileContent = updatePackageFile(model, initialPackageInfo);
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile.dependencies).to.have.property("@azure/core-lro", "^3.1.0");
      expect(packageFile.dependencies).to.have.property("@azure/abort-controller", "^2.1.2");
    });

    it("should update warp exports when exports option is provided for monorepo", () => {
      const model = createMockModel({
        hasLro: true,
      });

      const initialPackageInfo = {
        name: "@azure/test-package",
        version: "1.0.0",
        dependencies: {
          "@azure/core-client": "^1.0.0",
        },
        exports: {
          "./package.json": "./package.json",
          ".": {
            import: {
              types: "./dist/esm/index.d.ts",
              default: "./dist/esm/index.js",
            },
          },
        },
      };

      const newExports = {
        "./api": "./src/api/index.ts",
        "./models": "./src/models/index.ts",
      };

      const packageFileContent = updatePackageFile(model, initialPackageInfo, {
        exports: newExports,
      });
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile.dependencies).to.have.property("@azure/core-lro", "^3.1.0");
      expect(packageFile.dependencies).to.have.property("@azure/abort-controller", "^2.1.2");
      expect(packageFile).to.have.property("exports");
      expect(packageFile.exports["./package.json"]).to.equal("./package.json");
      expect(packageFile.exports["."]).to.have.property("import");
      expect(packageFile.exports["./api"]).to.have.property("import");
      expect(packageFile.exports["./models"]).to.have.property("import");
    });

    it("should update exports for monorepo even without tshy in package.json", () => {
      const model = createMockModel({
        hasLro: true,
      });

      const initialPackageInfo = {
        name: "@azure/test-package",
        version: "1.0.0",
        dependencies: {
          "@azure/core-client": "^1.0.0",
        },
      };

      const newExports = {
        "./api": "./src/api/index.ts",
        "./models": "./src/models/index.ts",
      };

      const packageFileContent = updatePackageFile(model, initialPackageInfo, {
        exports: newExports,
      });
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile.dependencies).to.have.property("@azure/core-lro", "^3.1.0");
      expect(packageFile.dependencies).to.have.property("@azure/abort-controller", "^2.1.2");
      // Monorepo uses warp exports directly in package.json
      expect(packageFile).to.have.property("exports");
      expect(packageFile.exports["./package.json"]).to.equal("./package.json");
      expect(packageFile.exports["."]).to.have.property("import");
      expect(packageFile).not.toHaveProperty("tshy");
    });

    it("should update constantPaths when clientContextPaths option is provided for Azure packages", () => {
      const model = createMockModel({
        hasLro: false,
      });

      const initialPackageInfo = {
        name: "@azure/test-package",
        version: "1.0.0",
        dependencies: {
          "@azure/core-client": "^1.0.0",
        },
        "//metadata": {
          constantPaths: [
            { path: "src/old-path.ts", prefix: "userAgentInfo" },
            { path: "src/other-file.ts", prefix: "packageDetails" },
          ],
        },
      };

      const packageFileContent = updatePackageFile(model, initialPackageInfo, {
        clientContextPaths: ["src/api/newContext.ts", "src/api/anotherContext.ts"],
      });
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile["//metadata"]).to.have.property("constantPaths");
      const constantPaths = packageFile["//metadata"]["constantPaths"];

      // Should keep non-userAgentInfo entries
      expect(constantPaths).toContainEqual({
        path: "src/other-file.ts",
        prefix: "packageDetails",
      });

      // Should replace old userAgentInfo entries with new ones
      expect(constantPaths).toContainEqual({
        path: "src/api/newContext.ts",
        prefix: "userAgentInfo",
      });
      expect(constantPaths).toContainEqual({
        path: "src/api/anotherContext.ts",
        prefix: "userAgentInfo",
      });

      // Should not include old userAgentInfo entry
      expect(constantPaths).not.toContainEqual({
        path: "src/old-path.ts",
        prefix: "userAgentInfo",
      });
    });

    it("should not update constantPaths when clientContextPaths is empty", () => {
      const model = createMockModel({
        hasLro: false,
      });

      const initialPackageInfo = {
        name: "@azure/test-package",
        version: "1.0.0",
        "//metadata": {
          constantPaths: [{ path: "src/old-path.ts", prefix: "userAgentInfo" }],
        },
      };

      const packageFileContent = updatePackageFile(model, initialPackageInfo, {
        clientContextPaths: [],
      });

      // Should still return a result (imports are added for warp packages),
      // but constantPaths should remain unchanged
      const packageInfo = JSON.parse(packageFileContent!.content);
      expect(packageInfo["//metadata"].constantPaths).toEqual([
        { path: "src/old-path.ts", prefix: "userAgentInfo" },
      ]);
    });

    it("should migrate @azure/core-client to @azure-rest/core-client", () => {
      const model = createMockModel({
        hasLro: false,
      });

      const initialPackageInfo = {
        name: "@azure/test-package",
        version: "1.0.0",
        dependencies: {
          "@azure/core-client": "^1.9.3",
          "@azure/core-rest-pipeline": "^1.19.1",
          tslib: "^2.6.2",
        },
      };

      const packageFileContent = updatePackageFile(model, initialPackageInfo);
      expect(packageFileContent).toBeDefined();
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile.dependencies).not.toHaveProperty("@azure/core-client");
      expect(packageFile.dependencies).to.have.property("@azure-rest/core-client", "^2.7.0");
      expect(packageFile.dependencies).to.have.property("@azure/core-rest-pipeline", "^1.19.1");
    });

    it("should not add duplicate @azure-rest/core-client if already present", () => {
      const model = createMockModel({
        hasLro: false,
      });

      const initialPackageInfo = {
        name: "@azure/test-package",
        version: "1.0.0",
        dependencies: {
          "@azure/core-client": "^1.9.3",
          "@azure-rest/core-client": "^2.7.0",
          tslib: "^2.6.2",
        },
      };

      const packageFileContent = updatePackageFile(model, initialPackageInfo);
      expect(packageFileContent).toBeDefined();
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      expect(packageFile.dependencies).not.toHaveProperty("@azure/core-client");
      // Existing version should be preserved, not overwritten
      expect(packageFile.dependencies).to.have.property("@azure-rest/core-client", "^2.7.0");
    });

    it("should only add platform imports when no @azure/core-client and no other update triggers", () => {
      const model = createMockModel({
        hasLro: false,
      });

      const initialPackageInfo = {
        name: "@azure/test-package",
        version: "1.0.0",
        dependencies: {
          "@azure-rest/core-client": "^2.7.0",
          "@azure/core-rest-pipeline": "^1.20.0",
          tslib: "^2.8.1",
        },
      };

      const packageFileContent = updatePackageFile(model, initialPackageInfo);
      expect(packageFileContent).toBeDefined();
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      // Dependencies should remain unchanged
      expect(packageFile.dependencies).not.toHaveProperty("@azure/core-client");
      expect(packageFile.dependencies).to.have.property("@azure-rest/core-client", "^2.7.0");

      // Platform imports should be added for Azure monorepo ESM packages.
      // By default (generateReactNativeTarget=false) the `react-native`
      // condition must NOT be emitted, matching the fresh-generation path.
      expect(packageFile).to.have.property("imports");
      expect(packageFile.imports).toEqual({
        "#platform/*": {
          browser: "./src/*-browser.mts",
          default: "./src/*.ts",
        },
      });
    });

    it("should include react-native in platform imports when generateReactNativeTarget is true", () => {
      const model = createMockModel({
        hasLro: false,
        generateReactNativeTarget: true,
      });

      const initialPackageInfo = {
        name: "@azure/test-package",
        version: "1.0.0",
        dependencies: {
          "@azure-rest/core-client": "^2.7.0",
          "@azure/core-rest-pipeline": "^1.20.0",
          tslib: "^2.8.1",
        },
      };

      const packageFileContent = updatePackageFile(model, initialPackageInfo);
      expect(packageFileContent).toBeDefined();
      const packageFile = JSON.parse(packageFileContent?.content ?? "{}");

      // When opted-in, the `react-native` condition is added and must be
      // positioned before `default` so Node's conditional resolution order
      // matches the fresh-generation output in packageCommon.ts.
      expect(packageFile).to.have.property("imports");
      expect(packageFile.imports).toEqual({
        "#platform/*": {
          browser: "./src/*-browser.mts",
          "react-native": "./src/*-react-native.mts",
          default: "./src/*.ts",
        },
      });
      expect(Object.keys(packageFile.imports["#platform/*"])).toEqual([
        "browser",
        "react-native",
        "default",
      ]);
    });
  });
});

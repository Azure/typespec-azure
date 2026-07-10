// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Project } from "ts-morph";
import { describe, expect, it } from "vitest";
import { buildUserAgentOptions } from "../../../src/modular/helpers/client-helpers.js";
import { ModularEmitterOptions } from "../../../src/modular/interfaces.js";

function createFactoryFunction() {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile("src/api/testContext.ts", "", {
    overwrite: true,
  });
  const factoryFunction = sourceFile.addFunction({
    name: "createTest",
    isExported: true,
  });
  return { sourceFile, factoryFunction };
}

function emitterOptionsWith(
  packageDetails: Record<string, unknown> | undefined,
): ModularEmitterOptions {
  return { options: { packageDetails } } as unknown as ModularEmitterOptions;
}

describe("buildUserAgentOptions", () => {
  it("reads the package version dynamically from package.json for the api context", () => {
    const { sourceFile, factoryFunction } = createFactoryFunction();
    const result = buildUserAgentOptions(
      factoryFunction,
      emitterOptionsWith({ name: "@azure/foo", nameWithoutScope: "foo" }),
      "azsdk-js-api",
    );
    const text = sourceFile.getFullText();

    expect(result).toBe("{ userAgentPrefix }");
    // A self-referencing JSON import of the package's own package.json is added.
    expect(text).toContain('import pkgJson from "@azure/foo/package.json"');
    expect(text).toContain('type: "json"');
    // The version is interpolated at runtime, not hardcoded.
    expect(text).toContain("azsdk-js-foo/${pkgJson.version}");
    expect(text).not.toContain("1.0.0-beta.1");
  });

  it("does not surface userAgentInfo (or import package.json) for the client prefix", () => {
    const { sourceFile, factoryFunction } = createFactoryFunction();
    buildUserAgentOptions(
      factoryFunction,
      emitterOptionsWith({ name: "@azure/foo", nameWithoutScope: "foo" }),
      "azsdk-js-client",
    );
    const text = sourceFile.getFullText();

    expect(text).not.toContain("userAgentInfo");
    expect(text).not.toContain("package.json");
  });

  it("does not surface userAgentInfo when no package name is available", () => {
    const { sourceFile, factoryFunction } = createFactoryFunction();
    buildUserAgentOptions(factoryFunction, emitterOptionsWith(undefined), "azsdk-js-api");
    const text = sourceFile.getFullText();

    expect(text).not.toContain("userAgentInfo");
    expect(text).not.toContain("package.json");
  });

  it("only imports package.json once when invoked for multiple clients in a file", () => {
    const { sourceFile, factoryFunction } = createFactoryFunction();
    const secondFactory = sourceFile.addFunction({ name: "createOther", isExported: true });
    const options = emitterOptionsWith({ name: "@azure/foo", nameWithoutScope: "foo" });

    buildUserAgentOptions(factoryFunction, options, "azsdk-js-api");
    buildUserAgentOptions(secondFactory, options, "azsdk-js-api");

    const importCount = sourceFile
      .getImportDeclarations()
      .filter((d) => d.getModuleSpecifierValue() === "@azure/foo/package.json").length;
    expect(importCount).toBe(1);
  });
});

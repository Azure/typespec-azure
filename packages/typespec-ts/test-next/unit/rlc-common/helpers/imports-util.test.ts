import { describe, expect, it } from "vitest";

import {
  buildRuntimeImports,
  getImportSpecifier,
} from "../../../../src/utils/imports-util.js";

describe("#buildRuntimeImports", () => {
  it("should return the correct import set", () => {
    const imports = buildRuntimeImports();
    expect(imports.commonFallback).toBeUndefined();
    expect(imports.restClient).toEqual({
      type: "restClient",
      specifier: "@azure-rest/core-client",
      version: "^2.0.0",
    });
  });
});

describe("#getImportSpecifier", () => {
  describe("#empty-imports", () => {
    it("should return the correct import specifier for core auth", () => {
      expect(getImportSpecifier("coreAuth", {} as any)).to.equal("@azure/core-auth");

      expect(getImportSpecifier("restClient", {} as any)).to.equal("@azure-rest/core-client");
    });
  });

  describe("#runtime-imports", () => {
    const runtimeImports = buildRuntimeImports();
    it("should return the correct import specifier for core auth", () => {
      expect(getImportSpecifier("coreAuth", runtimeImports)).to.equal("@azure/core-auth");

      expect(getImportSpecifier("restClient", runtimeImports)).to.equal("@azure-rest/core-client");
    });
  });
});

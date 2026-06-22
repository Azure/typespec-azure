import { describe, expect, it } from "vitest";

import {
  buildRuntimeImports,
  getImportSpecifier,
} from "../../../../src/rlc-common/helpers/imports-util.js";

describe("#buildRuntimeImports", () => {
  it("should return the correct import set for branded scope", () => {
    const imports = buildRuntimeImports("azure");
    expect(imports.commonFallback).toBeUndefined();
    expect(imports.restClient).toEqual({
      type: "restClient",
      specifier: "@azure-rest/core-client",
      version: "^2.0.0",
    });
  });

  it("should return the correct import set for non-branded scope", () => {
    const imports = buildRuntimeImports(undefined);
    expect(imports.commonFallback).toEqual({
      type: "commonFallback",
      specifier: "@typespec/ts-http-runtime",
      version: "0.1.0",
    });
    expect(imports.restClient).toBeUndefined();
  });
});

describe("#getImportSpecifier", () => {
  describe("#empty-imports", () => {
    it("should return the correct import specifier for core auth", () => {
      expect(getImportSpecifier("coreAuth", {} as any)).to.equal("@azure/core-auth");

      expect(getImportSpecifier("restClient", {} as any)).to.equal("@azure-rest/core-client");
    });
  });

  describe("#branded", () => {
    const branded = buildRuntimeImports("azure");
    it("should return the correct import specifier for core auth", () => {
      expect(getImportSpecifier("coreAuth", branded)).to.equal("@azure/core-auth");

      expect(getImportSpecifier("restClient", branded)).to.equal("@azure-rest/core-client");
    });
  });

  describe("#non-branded", () => {
    const nonBranded = buildRuntimeImports(undefined);
    it("should return the correct import specifier for core auth", () => {
      expect(getImportSpecifier("coreAuth", nonBranded)).to.equal("@typespec/ts-http-runtime");
      expect(getImportSpecifier("restClient", nonBranded)).to.equal("@typespec/ts-http-runtime");
      expect(getImportSpecifier("coreAuth", nonBranded, false)).to.equal("");
    });
  });
});

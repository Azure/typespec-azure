import type { Diagnostic, Namespace } from "@typespec/compiler";
import { getService } from "@typespec/compiler";
import { expectDiagnosticEmpty, expectDiagnostics, t } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { describe, expect, it } from "vitest";
import { findArmCommonTypeRecord, getExternalTypeRef } from "../src/common-types.js";
import type { ArmCommonTypeRecord } from "../src/commontypes.private.decorators.js";
import { Tester } from "./tester.js";

function boilerplate(version: string | undefined) {
  const decorators = ` ${
    version ? `@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.${version})` : ""
  }`;
  const nsDecorators = decorators;

  return `
    @armProviderNamespace
    @service
    ${nsDecorators}
    @test
    namespace Service;
  `;
}

describe("common definition", () => {
  async function compute(
    decorators: string,
    commonTypesVersion: string,
  ): Promise<[ArmCommonTypeRecord | undefined, readonly Diagnostic[]]> {
    const { Foo, Service, program } = await Tester.compile(t.code`
    ${boilerplate(commonTypesVersion)}

    ${decorators}
    model ${t.model("Foo")} {}
  `);
    return findArmCommonTypeRecord(program, Foo, {
      service: getService(program, Service as Namespace)!,
    });
  }

  describe("type available in all versions", () => {
    it.each(["v3", "v4", "v5"])("link to %s", async (version) => {
      const [ref, diagnostics] = await compute(
        `
          @Azure.ResourceManager.CommonTypes.Private.armCommonDefinition("Foo", Azure.ResourceManager.CommonTypes.Versions.v3, "foo.json")
          @Azure.ResourceManager.CommonTypes.Private.armCommonDefinition("Foo", Azure.ResourceManager.CommonTypes.Versions.v4, "foo.json")
          @Azure.ResourceManager.CommonTypes.Private.armCommonDefinition("Foo", Azure.ResourceManager.CommonTypes.Versions.v5, "foo.json")
        `,
        version,
      );
      expectDiagnosticEmpty(diagnostics);
      expect(ref).toEqual({
        basePath: "{arm-types-dir}",
        kind: "definitions",
        name: "Foo",
        referenceFile: "foo.json",
        version,
      });
    });
  });

  describe("type added in v4", () => {
    const decorators = `
      @Azure.ResourceManager.CommonTypes.Private.armCommonDefinition("Foo", Azure.ResourceManager.CommonTypes.Versions.v4, "foo.json")
      @Azure.ResourceManager.CommonTypes.Private.armCommonDefinition("Foo", Azure.ResourceManager.CommonTypes.Versions.v5, "foo.json")
    `;
    it.each(["v3"])("using in %s emits diagnostics", async () => {
      const [_, diagnostics] = await compute(decorators, "v3");
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-incompatible-version",
        message:
          "No ARM common-types version for this type satisfies the expected version v3.  This type only supports the following version(s): v5, v4",
      });
    });
    it.each(["v4", "v5"])("using in %s links to version", async (version) => {
      const [ref, diagnostics] = await compute(decorators, version);
      expectDiagnosticEmpty(diagnostics);
      expect(ref).toEqual({
        basePath: "{arm-types-dir}",
        kind: "definitions",
        name: "Foo",
        referenceFile: "foo.json",
        version,
      });
    });
  });

  describe("type added in v5", () => {
    const decorators = `
      @Azure.ResourceManager.CommonTypes.Private.armCommonDefinition("Foo", Azure.ResourceManager.CommonTypes.Versions.v5, "foo.json")
    `;
    it.each(["v3", "v4"])("using in %s emits diagnostics", async () => {
      const [_, diagnostics] = await compute(decorators, "v3");
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-incompatible-version",
        message:
          "No ARM common-types version for this type satisfies the expected version v3.  This type only supports the following version(s): v5",
      });
    });
    it.each(["v5"])("using in %s links to version", async (version) => {
      const [ref, diagnostics] = await compute(decorators, version);
      expectDiagnosticEmpty(diagnostics);
      expect(ref).toEqual({
        basePath: "{arm-types-dir}",
        kind: "definitions",
        name: "Foo",
        referenceFile: "foo.json",
        version,
      });
    });
  });
});

describe("common parameters", () => {
  async function compute(
    decorators: string,
    commonTypesVersion: string,
  ): Promise<[ArmCommonTypeRecord | undefined, readonly Diagnostic[]]> {
    const { foo, Service, program } = await Tester.compile(t.code`
    ${boilerplate(commonTypesVersion)}

    model Foo {
      ${decorators}
      ${t.modelProperty("foo")}: string;
    }
  `);
    return findArmCommonTypeRecord(program, foo, {
      service: getService(program, Service as Namespace)!,
    });
  }

  describe("type available in all versions", () => {
    it.each(["v3", "v4", "v5"])("using %s link to version", async (version) => {
      const [ref, diagnostics] = await compute(
        `
          @Azure.ResourceManager.CommonTypes.Private.armCommonParameter("Foo", Azure.ResourceManager.CommonTypes.Versions.v3, "foo.json")
          @Azure.ResourceManager.CommonTypes.Private.armCommonParameter("Foo", Azure.ResourceManager.CommonTypes.Versions.v4, "foo.json")
          @Azure.ResourceManager.CommonTypes.Private.armCommonParameter("Foo", Azure.ResourceManager.CommonTypes.Versions.v5, "foo.json")
        `,
        version,
      );
      expectDiagnosticEmpty(diagnostics);
      expect(ref).toEqual({
        basePath: "{arm-types-dir}",
        kind: "parameters",
        name: "Foo",
        referenceFile: "foo.json",
        version,
      });
    });
  });

  describe("type added in v4", () => {
    const decorators = `
      @Azure.ResourceManager.CommonTypes.Private.armCommonParameter("Foo", Azure.ResourceManager.CommonTypes.Versions.v4, "foo.json")
      @Azure.ResourceManager.CommonTypes.Private.armCommonParameter("Foo", Azure.ResourceManager.CommonTypes.Versions.v5, "foo.json")
    `;
    it.each(["v3"])("using in %s emits diagnostics", async () => {
      const [_, diagnostics] = await compute(decorators, "v3");
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-incompatible-version",
        message:
          "No ARM common-types version for this type satisfies the expected version v3.  This type only supports the following version(s): v5, v4",
      });
    });
    it.each(["v4", "v5"])("using in %s links to version", async (version) => {
      const [ref, diagnostics] = await compute(decorators, version);
      expectDiagnosticEmpty(diagnostics);
      expect(ref).toEqual({
        basePath: "{arm-types-dir}",
        kind: "parameters",
        name: "Foo",
        referenceFile: "foo.json",
        version,
      });
    });
  });

  describe("type added in v5", () => {
    const decorators = `
      @Azure.ResourceManager.CommonTypes.Private.armCommonParameter("Foo", Azure.ResourceManager.CommonTypes.Versions.v5, "foo.json")
    `;
    it.each(["v3", "v4"])("using in %s emits diagnostics", async () => {
      const [_, diagnostics] = await compute(decorators, "v3");
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-azure-resource-manager/arm-common-types-incompatible-version",
        message:
          "No ARM common-types version for this type satisfies the expected version v3.  This type only supports the following version(s): v5",
      });
    });
    it.each(["v5"])("using in %s links to version", async (version) => {
      const [ref, diagnostics] = await compute(decorators, version);
      expectDiagnosticEmpty(diagnostics);
      expect(ref).toEqual({
        basePath: "{arm-types-dir}",
        kind: "parameters",
        name: "Foo",
        referenceFile: "foo.json",
        version,
      });
    });
  });
});

describe("common types ref", () => {
  it("set external reference", async () => {
    const { Foo, program } = await Tester.compile(t.code`
        @Azure.ResourceManager.Legacy.externalTypeRef("../common.json#/definitions/Foo")
        model ${t.model("Foo")} {}
      `);

    strictEqual(getExternalTypeRef(program, Foo), "../common.json#/definitions/Foo");
  });
});

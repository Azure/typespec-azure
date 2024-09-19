import type { Diagnostic, Model, ModelProperty, Namespace } from "@typespec/compiler";
import { getService } from "@typespec/compiler";
import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { findArmCommonTypeRecord } from "../src/common-types.js";
import type { ArmCommonTypeRecord } from "../src/commontypes.private.decorators.js";
import { createAzureResourceManagerTestRunner } from "./test-host.js";

function boilerplate(version: string | undefined) {
  // const versions = useVersionEnum ? ["v1", "v2"] : undefined;
  const decorators = `@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) ${
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
    const runner = await createAzureResourceManagerTestRunner();
    const { Foo, Service } = (await runner.compile(`
    ${boilerplate(commonTypesVersion)}

    ${decorators}
    @test
    model Foo {}
  `)) as { Foo: Model; Service: Namespace };
    return findArmCommonTypeRecord(runner.program, Foo, {
      service: getService(runner.program, Service)!,
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
    const runner = await createAzureResourceManagerTestRunner();
    const { foo, Service } = (await runner.compile(`
    ${boilerplate(commonTypesVersion)}

    
    model Foo {
      @test ${decorators}
      foo: string;
    }
  `)) as { foo: ModelProperty; Service: Namespace };
    return findArmCommonTypeRecord(runner.program, foo, {
      service: getService(runner.program, Service)!,
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

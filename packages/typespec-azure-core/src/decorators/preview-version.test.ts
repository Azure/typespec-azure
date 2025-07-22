import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { expect, it } from "vitest";
import { Tester } from "../../test/test-host.js";
import { isPreviewVersion } from "./preview-version.js";

it("emit diagnostic if use on non enum member", async () => {
  const diagnostics = await Tester.diagnose(`
    @previewVersion
    model Foo {}
  `);
  expectDiagnostics(diagnostics, {
    code: "decorator-wrong-target",
    message:
      "Cannot apply @previewVersion decorator to Foo since it is not assignable to EnumMember",
  });
});

it("emit diagnostic if use on enum member that is not part of a version enum", async () => {
  const diagnostics = await Tester.diagnose(`
    enum Foo {
      @previewVersion
      v1: "1.0",
    }
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-core/preview-version-invalid-enum-member",
    message: "@previewVersion can only be applied to members of a Version enum.",
  });
});

it("emit diagnostic if use on enum member that is not the last member", async () => {
  const diagnostics = await Tester.diagnose(`
    @versioned(Versions)
    @service
    namespace DemoService;

    enum Versions {
      v1,
      @Azure.Core.previewVersion
      v2Preview: "2.0-preview",
      v2: "2.0",
    }
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-core/preview-version-last-member",
    message:
      "@previewVersion can only be applied to the last member of a Version enum. Having it on other members will cause unstable apis to show up in subsequent stable versions.",
  });
});

it("succeeds to decorate the last enum member", async () => {
  const { program, v2Preview } = await Tester.compile(t.code`
    @versioned(Versions)
    @service
    namespace DemoService;

    enum Versions {
      v1,
      @Azure.Core.previewVersion
      ${t.enumMember("v2Preview")}: "2.0-preview",
    }
  `);

  expect(v2Preview.name).toBe("v2Preview");
  expect(isPreviewVersion(program, v2Preview)).toBe(true);
});

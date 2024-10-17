import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
  createTestWrapper,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { nonBreakingVersioningRule } from "../../src/rules/non-breaking-versioning.js";
import { createAzureCoreTestHost } from "../test-host.js";

describe("typespec-azure-core: non-breaking-versioning rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    const host = await createAzureCoreTestHost();
    runner = createTestWrapper(host, {
      wrapper: (code) =>
        `
        using TypeSpec.Versioning;
        
        @versioned(Versions)
        namespace Test;

        enum Versions {
          v2022_09_29: "2022-09-29",
          v2022_10_29: "2022-10-29"
        }
        
        ${code}`,
    });
    tester = createLinterRuleTester(
      runner,
      nonBreakingVersioningRule,
      "@azure-tools/typespec-azure-core",
    );
  });

  describe("using @removed", () => {
    it("emit diagnostic on model", async () => {
      await tester
        .expect(
          `
            @removed(Versions.v2022_10_29)
            model Foo {}
          `,
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-core/non-breaking-versioning",
          message: "Using @removed is not backward compatible.",
        });
    });

    it("emit diagnostic on model property", async () => {
      await tester
        .expect(
          `
          model Foo {
            @removed(Versions.v2022_10_29)
            bar: string;
          }
          `,
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-core/non-breaking-versioning",
          message: "Using @removed is not backward compatible.",
        });
    });

    it("emit diagnostic on operation", async () => {
      await tester
        .expect(
          `
          @removed(Versions.v2022_10_29)
          op getTest(): string;
          `,
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-core/non-breaking-versioning",
          message: "Using @removed is not backward compatible.",
        });
    });
  });

  describe("using @replacedFrom", () => {
    it("emit diagnostic on model", async () => {
      await tester
        .expect(
          `
          @renamedFrom(Versions.v2022_10_29, "Bar")
          model Foo {}
          `,
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-core/non-breaking-versioning",
          message: "Using @renamedFrom is not backward compatible.",
        });
    });

    it("emit diagnostic on model property", async () => {
      await tester
        .expect(
          `
          model Foo {
            @renamedFrom(Versions.v2022_10_29, "bar")
            baz: string;
          }
          `,
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-core/non-breaking-versioning",
          message: "Using @renamedFrom is not backward compatible.",
        });
    });
  });

  describe("using @added", () => {
    it("no diagnostic on model", async () => {
      await tester
        .expect(
          `
          @added(Versions.v2022_10_29)
          model Foo {}
          `,
        )
        .toBeValid();
    });

    it("no diagnostic on operation", async () => {
      await tester
        .expect(
          `
          @added(Versions.v2022_10_29)
          op getTest(): string;
          `,
        )
        .toBeValid();
    });

    it("no diagnostic on optional model property", async () => {
      await tester
        .expect(
          `
          model Foo {
            @added(Versions.v2022_10_29)
            bar?: string;
          }
          `,
        )
        .toBeValid();
    });

    it("emit diagnostic if required property is added", async () => {
      await tester
        .expect(
          `
          model Foo {
            @added(Versions.v2022_10_29)
            bar: string;
          }
          `,
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-core/non-breaking-versioning",
          message: "Adding required property is a breaking change.",
        });
    });
  });

  describe("using @makeOptional", () => {
    it("no diagnostic on optional model with default", async () => {
      await tester
        .expect(
          `
          model Foo {
            @madeOptional(Versions.v2022_10_29)
            bar?: string = "my-default";
          }
          `,
        )
        .toBeValid();
    });

    it("emit diagnostic if property made optional has no default.", async () => {
      await tester
        .expect(
          `
        model Foo {
          @madeOptional(Versions.v2022_10_29)
          bar?: string;
        }
        `,
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-core/non-breaking-versioning",
          message: "Property made optional should have a default value.",
        });
    });
  });
});

import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armVersionProgressionRule } from "../../src/rules/arm-version-progression.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armVersionProgressionRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("is valid for chronologically increasing versions with unique dates", async () => {
  await tester
    .expect(
      `
      @versioned(Versions)
      @armProviderNamespace
      namespace Microsoft.Foo;

      enum Versions {
        v2024_01_01_preview: "2024-01-01-preview",
        v2024_03_01: "2024-03-01",
        v2024_06_01: "2024-06-01",
      }
      `,
    )
    .toBeValid();
});

it("is valid when there is only a single version", async () => {
  await tester
    .expect(
      `
      @versioned(Versions)
      @armProviderNamespace
      namespace Microsoft.Foo;

      enum Versions {
        v2024_01_01: "2024-01-01",
      }
      `,
    )
    .toBeValid();
});

it("is valid when the namespace is not versioned", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;
      `,
    )
    .toBeValid();
});

it("emits diagnostic when versions are not in chronological order", async () => {
  await tester
    .expect(
      `
      @versioned(Versions)
      @armProviderNamespace
      namespace Microsoft.Foo;

      enum Versions {
        v2024_06_01: "2024-06-01",
        v2024_01_01: "2024-01-01",
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-version-progression",
      message:
        "Version '2024-01-01' is declared after '2024-06-01' but is not chronologically later. ARM versions must be declared in strictly increasing chronological order by date.",
    });
});

it("emits diagnostic when a stable version shares a date with a preview version", async () => {
  await tester
    .expect(
      `
      @versioned(Versions)
      @armProviderNamespace
      namespace Microsoft.Foo;

      enum Versions {
        v2026_04_28_preview: "2026-04-28-preview",
        v2026_04_28: "2026-04-28",
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-version-progression",
      message:
        "Version '2026-04-28' has the same date as '2026-04-28-preview'. Every ARM api-version must use a unique date — preview and stable versions cannot share the same 'YYYY-MM-DD'.",
    });
});

it("emits diagnostic when a preview version follows the stable version with the same date", async () => {
  await tester
    .expect(
      `
      @versioned(Versions)
      @armProviderNamespace
      namespace Microsoft.Foo;

      enum Versions {
        v2024_01_01: "2024-01-01",
        v2024_01_01_preview: "2024-01-01-preview",
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-version-progression",
      message:
        "Version '2024-01-01-preview' has the same date as '2024-01-01'. Every ARM api-version must use a unique date — preview and stable versions cannot share the same 'YYYY-MM-DD'.",
    });
});

it("emits diagnostic when two preview versions share a date", async () => {
  await tester
    .expect(
      `
      @versioned(Versions)
      @armProviderNamespace
      namespace Microsoft.Foo;

      enum Versions {
        v2024_01_01_alpha_1: "2024-01-01-alpha.1",
        v2024_01_01_alpha_2: "2024-01-01-alpha.2",
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-version-progression",
      message:
        "Version '2024-01-01-alpha.2' has the same date as '2024-01-01-alpha.1'. Every ARM api-version must use a unique date — preview and stable versions cannot share the same 'YYYY-MM-DD'.",
    });
});

it("ignores malformed version strings (handled by arm-resource-invalid-version-format)", async () => {
  await tester
    .expect(
      `
      @versioned(Versions)
      @armProviderNamespace
      namespace Microsoft.Foo;

      enum Versions {
        v1: "not-a-date",
        v2: "2024-01-01",
      }
      `,
    )
    .toBeValid();
});

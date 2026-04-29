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

it("is valid for chronologically increasing versions", async () => {
  await tester
    .expect(
      `
      @versioned(Versions)
      @armProviderNamespace
      namespace Microsoft.Foo;

      enum Versions {
        v2024_01_01_preview: "2024-01-01-preview",
        v2024_01_01: "2024-01-01",
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

it("is valid for ordered preview suffixes with version numbers on the same date", async () => {
  await tester
    .expect(
      `
      @versioned(Versions)
      @armProviderNamespace
      namespace Microsoft.Foo;

      enum Versions {
        v1: "2024-01-01-alpha.1",
        v2: "2024-01-01-alpha.2",
        v3: "2024-01-01-preview",
        v4: "2024-01-01",
      }
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
        "Version '2024-01-01' is declared after '2024-06-01' but is not chronologically later. ARM versions must be declared in strictly increasing chronological order.",
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
        "Preview version '2024-01-01-preview' must not appear after the stable version '2024-01-01' with the same date '2024-01-01'. Stable versions must come after their preview counterparts.",
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

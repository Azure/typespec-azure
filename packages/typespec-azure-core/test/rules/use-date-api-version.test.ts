import { Tester } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { useDateApiVersionRule } from "../../src/rules/use-date-api-version.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    useDateApiVersionRule,
    "@azure-tools/typespec-azure-core",
  );
});

describe("use-date-api-version", () => {
  it("is valid for a stable date version", async () => {
    await tester
      .expect(
        `
        @service
        @versioned(Versions)
        namespace Azure.MyService;

        enum Versions {
          v2022_11_18: "2022-11-18",
        }
        `,
      )
      .toBeValid();
  });

  it("is valid for a preview date version", async () => {
    await tester
      .expect(
        `
        @service
        @versioned(Versions)
        namespace Azure.MyService;

        enum Versions {
          v2022_11_18_preview: "2022-11-18-preview",
          v2023_01_31: "2023-01-31",
        }
        `,
      )
      .toBeValid();
  });

  it("is valid for a leap day", async () => {
    await tester
      .expect(
        `
        @service
        @versioned(Versions)
        namespace Azure.MyService;

        enum Versions {
          v2024_02_29: "2024-02-29",
        }
        `,
      )
      .toBeValid();
  });

  it("is valid when the service is not versioned", async () => {
    await tester
      .expect(
        `
        @service
        namespace Azure.MyService;
        `,
      )
      .toBeValid();
  });

  it("emits diagnostic for a semver-style version", async () => {
    await tester
      .expect(
        `
        @service
        @versioned(Versions)
        namespace Azure.MyService;

        enum Versions {
          v1,
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/use-date-api-version",
          severity: "warning",
          message:
            'API version "v1" must use the "YYYY-MM-DD" date format, optionally followed by a "-preview" suffix. For example "2022-11-18" or "2022-11-18-preview".',
        },
      ]);
  });

  it("emits diagnostic for a date that is not zero-padded", async () => {
    await tester
      .expect(
        `
        @service
        @versioned(Versions)
        namespace Azure.MyService;

        enum Versions {
          v2021_6_4: "2021-6-4",
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/use-date-api-version",
          severity: "warning",
          message:
            'API version "2021-6-4" must use the "YYYY-MM-DD" date format, optionally followed by a "-preview" suffix. For example "2022-11-18" or "2022-11-18-preview".',
        },
      ]);
  });

  it("emits diagnostic for a non-`-preview` suffix", async () => {
    await tester
      .expect(
        `
        @service
        @versioned(Versions)
        namespace Azure.MyService;

        enum Versions {
          v2021_06_04_beta: "2021-06-04-beta",
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/use-date-api-version",
          severity: "warning",
          message:
            'API version "2021-06-04-beta" must use the "YYYY-MM-DD" date format, optionally followed by a "-preview" suffix. For example "2022-11-18" or "2022-11-18-preview".',
        },
      ]);
  });

  it("emits diagnostic for a date-shaped value that is not a real date", async () => {
    await tester
      .expect(
        `
        @service
        @versioned(Versions)
        namespace Azure.MyService;

        enum Versions {
          v2021_13_45: "2021-13-45",
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/use-date-api-version",
          severity: "warning",
          message:
            'API version "2021-13-45" is not a valid date. Use a real "YYYY-MM-DD" date, optionally followed by a "-preview" suffix.',
        },
      ]);
  });

  it("emits diagnostic for a February 30th style date", async () => {
    await tester
      .expect(
        `
        @service
        @versioned(Versions)
        namespace Azure.MyService;

        enum Versions {
          v2023_02_29: "2023-02-29",
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/use-date-api-version",
          severity: "warning",
          message:
            'API version "2023-02-29" is not a valid date. Use a real "YYYY-MM-DD" date, optionally followed by a "-preview" suffix.',
        },
      ]);
  });

  it("emits one diagnostic per invalid version", async () => {
    await tester
      .expect(
        `
        @service
        @versioned(Versions)
        namespace Azure.MyService;

        enum Versions {
          v1: "v1",
          v2: "v2",
          v2022_11_18: "2022-11-18",
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/use-date-api-version",
          severity: "warning",
        },
        {
          code: "@azure-tools/typespec-azure-core/use-date-api-version",
          severity: "warning",
        },
      ]);
  });

  it("is not reported for an enum that is not the service version enum", async () => {
    await tester
      .expect(
        `
        @service
        @versioned(Versions)
        namespace Azure.MyService;

        enum Versions {
          v2022_11_18: "2022-11-18",
        }

        enum Colors {
          red: "v1",
        }
        `,
      )
      .toBeValid();
  });
});

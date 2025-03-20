import {
  BasicTestRunner,
  createLinterRuleTester,
  LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { requireVersionedServiceRule } from "../../src/rules/require-versioned-service.rule.js";
import { createSdkTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createSdkTestRunner();
  tester = createLinterRuleTester(
    runner,
    requireVersionedServiceRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

describe("@additionalApiVersions", () => {
  it("without versioned service", async () => {
    await tester
      .expect(
        `
        @service
        @additionalApiVersions(AdditionalApiVersions)
        namespace My.Service {
          enum AdditionalApiVersions { v1, v2, v3 };
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/require-versioned-service",
          severity: "warning",
          message: `Service "My.Service" must be versioned if you want to apply the "@additionalApiVersions" decorator`,
        },
      ]);
  });

  it("with versioned service", async () => {
    await tester
      .expect(
        `
        @service
        @versioned(Versions)
        @additionalApiVersions(AdditionalApiVersions)
        namespace My.Service {
          enum Versions {v4, v5, v6}
          enum AdditionalApiVersions { v1, v2, v3 };
        }
        `,
      )
      .toBeValid();
  });
});

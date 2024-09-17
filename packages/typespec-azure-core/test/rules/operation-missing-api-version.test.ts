import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { apiVersionRule } from "../../src/rules/operation-missing-api-version.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: api-version-parameter rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
    tester = createLinterRuleTester(runner, apiVersionRule, "@azure-tools/typespec-azure-core");
  });

  it("emits `operation-missing-api-version` when a versioned operation does not include the ApiVersionParameter", async () => {
    await tester
      .expect(
        `
        @service
        @versioned(Versions)
        namespace Test;
        
        enum Versions {
          @useDependency(Azure.Core.Versions.v1_0_Preview_2)
          v1_0: "v1.0";
        }

        @route("/test")
        op test(): string;

        interface TestInterface {
          @route("/interfaceTest")
          op interfaceTest(): string;
        }
      `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/operation-missing-api-version",
          severity: "warning",
          message: "Operation is missing an api version parameter.",
        },
        {
          code: "@azure-tools/typespec-azure-core/operation-missing-api-version",
          severity: "warning",
          message: "Operation is missing an api version parameter.",
        },
      ]);
  });

  it("does not emit `operation-missing-api-version` when a versioned operation includes the ApiVersionParameter", async () => {
    await tester
      .expect(
        `
        @service
        @versioned(Versions)
        namespace Test;
        
        enum Versions {
          @useDependency(Azure.Core.Versions.v1_0_Preview_2)
          v1_0: "v1.0";
        }

        op test(...Azure.Core.Foundations.ApiVersionParameter): string;
        op test2(apiVersion: string): string;
      `,
      )
      .toBeValid();
  });

  it("does not emit `operation-missing-api-version` when an unversioned operation does not include the ApiVersionParameter", async () => {
    await tester
      .expect(
        `
        @service
        namespace Test;
        
        enum Versions {
          @useDependency(Azure.Core.Versions.v1_0_Preview_2)
          v1_0: "v1.0";
        }

        op test(): string;
      `,
      )
      .toBeValid();
  });
});

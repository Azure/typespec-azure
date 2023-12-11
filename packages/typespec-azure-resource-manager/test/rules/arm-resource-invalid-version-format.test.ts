import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

import { armResourceInvalidVersionFormatRule } from "../../src/rules/arm-resource-invalid-version-format.js";

describe("typespec-azure-resource-manager: arm resource versions format rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      armResourceInvalidVersionFormatRule,
      "@azure-tools/typespec-azure-resource-manager"
    );
  });

  it("version as YYYY-MM-DD are valid", async () => {
    await tester
      .expect(
        `
    @versioned(Versions)
    @armProviderNamespace
    namespace Microsoft.Foo;

    enum Versions { v1: "2022-02-01", \`2022-02-02\` }
    `
      )
      .toBeValid();
  });

  it("version as YYYY-MM-DD-<suffix> are valid", async () => {
    await tester
      .expect(
        `
    @versioned(Versions)
    @armProviderNamespace
    namespace Microsoft.Foo;

    enum Versions { v1: "2022-02-01-preview", v2: "2022-02-02-alpha.3" }
    `
      )
      .toBeValid();
  });

  it("emit warning when using number as value", async () => {
    await tester
      .expect(
        `
      @versioned(Versions)
      @armProviderNamespace
      namespace Microsoft.Foo;

      enum Versions { v1: 1.0 }
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-version-format",
        message: `The versions for Azure Resource Manager Services must use strings of the form "YYYY-MM-DD[-suffix]."`,
      });
  });

  it("emit warning when version is not YYYY-MM-DD[-suffix]", async () => {
    await tester
      .expect(
        `
      @versioned(Versions)
      @armProviderNamespace
      namespace Microsoft.Foo;

      enum Versions { v1: "1.2.3" }
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-version-format",
        message: `The version '1.2.3' is invalid. Versions for arm resources must be of the form "YYYY-MM-DD" and may have a suffix, like "-preview" or a versioned suffix,  "-alpha.1".`,
      });
  });
});

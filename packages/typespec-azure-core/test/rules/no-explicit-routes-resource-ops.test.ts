import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noExplicitRoutesResourceOps } from "../../src/rules/no-explicit-routes-resource-ops.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: no explicit routes on resource operations", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(
      runner,
      noExplicitRoutesResourceOps,
      "@azure-tools/typespec-azure-core"
    );
  });

  it("emit a warning if @route is used on a resource operation", async () => {
    await tester
      .expect(
        `
        @resource("widgets") model Widget { @key name: string; }

        @route("/api/widgets/{name}")
        op readWidget is Azure.Core.StandardResourceOperations.ResourceRead<Widget>;

        @route("/api/widgets")
        op listWidgets is Azure.Core.StandardResourceOperations.ResourceList<Widget>;
        `
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-explicit-routes-resource-ops",
          severity: "warning",
          message: `The @route decorator should not be used on standard resource operation signatures. If you are trying to add a route prefix to an operation use the @route decorator on an interface or namespace instead.`,
        },
        {
          code: "@azure-tools/typespec-azure-core/no-explicit-routes-resource-ops",
          severity: "warning",
          message: `The @route decorator should not be used on standard resource operation signatures. If you are trying to add a route prefix to an operation use the @route decorator on an interface or namespace instead.`,
        },
      ]);
  });
});

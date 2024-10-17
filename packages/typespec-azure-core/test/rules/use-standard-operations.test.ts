import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { useStandardOperations } from "../../src/rules/use-standard-operations.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: use-standard-operations rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(
      runner,
      useStandardOperations,
      "@azure-tools/typespec-azure-core",
    );
  });

  it("emits a diagnostic for operations not defined from a standard signature", async () => {
    await tester
      .expect(
        `
      @route("bad")
      op badOp(): string;

      // Skipped because it's a templated operation
      op BadBaseOp<TParams>(...TParams): string;

      @route("badder")
      op anotherBadOp is BadBaseOp<{}>;

      op GoodBaseOp<TResource extends TypeSpec.Reflection.Model> is Azure.Core.StandardResourceOperations.ResourceRead<TResource>;

      @resource("widgets")
      model Widget {
        @key
        name: string;
      }

      @route("good")
      op goodOp is GoodBaseOp<Widget>;
`,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/use-standard-operations",
          message:
            "Operation 'badOp' should be defined using a signature from the Azure.Core namespace.",
        },
        {
          code: "@azure-tools/typespec-azure-core/use-standard-operations",
          message:
            "Operation 'anotherBadOp' should be defined using a signature from the Azure.Core namespace.",
        },
      ]);
  });

  it("emits a diagnostic for operations defined from a low-level Foundations signature", async () => {
    await tester
      .expect(
        `
      @resource("widgets")
      model Widget { @key name: string; }

      op CustomResourceOp<TResource extends TypeSpec.Reflection.Model> is Azure.Core.Foundations.ResourceOperation<TResource, {}, TResource>;
      op usingCustomOp is CustomResourceOp<Widget>;
`,
      )
      .toEmitDiagnostics([
        // NOTE: This is *desired behavior* because any new operation defined from a
        // low-level signature likely will not be following the Azure REST API Guidelines.
        {
          code: "@azure-tools/typespec-azure-core/use-standard-operations",
          message:
            "Operation 'usingCustomOp' should be defined using a signature from the Azure.Core namespace.",
        },
      ]);
  });
});

import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noGenericTypesRule } from "../../src/rules/no-generic-types.js";
import { createAzureCoreTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
  tester = createLinterRuleTester(runner, noGenericTypesRule, "@azure-tools/typespec-azure-core");
});

it("emits a warning diagnostic for non-standard integer types", async () => {
  await tester
    .expect(
      `
      namespace Azure.Widget;

      model Widget {
        prop1: uint16;
        prop2: int8;
        prop3: uint32;
      }
      `
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/use-standard-integer",
      },
      {
        code: "@azure-tools/typespec-azure-core/use-standard-integer",
      },
      {
        code: "@azure-tools/typespec-azure-core/use-standard-integer",
      },
    ]);
});

it("does not emit a warning diagnostic for standard integer types", async () => {
  await tester
    .expect(
      `
      namespace Azure.Widget;

      model Widget {
        prop1: int32;
        prop2: int64;
        prop3: safeint;
      }
      `
    )
    .toBeValid();
});

it("does not emit a warning diagnostic for non-standard integer types that map to supported integers in Autorest", async () => {
  await tester
    .expect(
      `
      namespace Azure.Widget;

      model Widget {
        prop1: numeric;
        prop2: integer
      }
      `
    )
    .toBeValid();
});

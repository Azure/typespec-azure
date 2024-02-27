import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { armNoRecordRule } from "../../src/rules/arm-no-record.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureResourceManagerTestRunner();
  tester = createLinterRuleTester(
    runner,
    armNoRecordRule,
    "@azure-tools/typespec-azure-resource-manager"
  );
});

it("emits diagnostic when a model property uses Record type", async () => {
  await tester
    .expect(
      `
    model WidgetProperties {
      props: Record<string>;
    }
    `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-no-record",
      message:
        "Properties should not be of type Record. ARM requires Resource provider teams to define types explicitly.",
    });
});

it("emits diagnostic when a model extends Record type", async () => {
  await tester
    .expect(
      `
    model WidgetProperties extends Record<string> {}
    `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-no-record",
      message:
        "Models should not extend type Record. ARM requires Resource provider teams to define types explicitly.",
    });
});

it("emits diagnostic when a model is Record type", async () => {
  await tester
    .expect(
      `
    model WidgetProperties is Record<string>;
    `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-no-record",
      message:
        "Models should not equate to type Record. ARM requires Resource provider teams to define types explicitly.",
    });
});

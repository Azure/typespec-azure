import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noEmptyModel } from "../../src/rules/no-empty-model.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

const armDef = `
@armProviderNamespace
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.Contoso;
`;

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureResourceManagerTestRunner();
  tester = createLinterRuleTester(
    runner,
    noEmptyModel,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("emits diagnostic when a property use type:object that is not defined", async () => {
  await tester
    .expect(
      ` 
      ${armDef}
      model Foo { 
        props: {};
      } 
        `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/no-empty-model",
      message: "Properties with type:object must have definition of a reference model.",
    });
});

it("emits diagnostic when model type:object is not defined", async () => {
  await tester
    .expect(
      ` 
      ${armDef}
      model Foo { } 
        `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/no-empty-model",
      message: "Properties with type:object must have definition of a reference model.",
    });
});

it("valid when the empty model is a record", async () => {
  await tester
    .expect(
      ` 
      ${armDef}
      model PortalExtensionCompileFileResult is Record<unknown>;
        `,
    )
    .toBeValid();
});

it("valid when a property use type:object that is defined", async () => {
  await tester
    .expect(
      `
      ${armDef}
      model WidgetProperties {
        props: Foo;
      }

      model Foo{
        Name: string;
      }
    `,
    )
    .toBeValid();
});

it("valid when a property use type:object known scalar", async () => {
  await tester
    .expect(
      ` 
      ${armDef}
      model WidgetProperties {
        Date: utcDateTime;
      }
        `,
    )
    .toBeValid();
});

it("valid when a property use a simple data type ", async () => {
  await tester
    .expect(
      ` 
      ${armDef}
      model WidgetProperties {
        Name: string;
      }
        `,
    )
    .toBeValid();
});

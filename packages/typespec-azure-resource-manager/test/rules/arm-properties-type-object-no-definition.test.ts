import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { armPropertiesTypeObjectNoDefinitionRule } from "../../src/rules/arm-properties-type-object-no-definition.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

const armDef = `
@armProviderNamespace
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.Contoso;
`;

describe("typespec-azure-resource-manager: arm properties type-object no definition rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      armPropertiesTypeObjectNoDefinitionRule,
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
        code: "@azure-tools/typespec-azure-resource-manager/arm-properties-type-object-no-definition",
        message: "Properties with type:object must have definition of a reference model.",
      });
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
});

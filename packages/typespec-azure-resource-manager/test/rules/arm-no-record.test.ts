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

const nsDef = `
@armProviderNamespace
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.Contoso;
`;

const resource = `
@Azure.ResourceManager.tenantResource
model Widget is ProxyResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @path
  @visibility("read")
  name: string;
}
`;

it("emits diagnostic when a model property uses Record type", async () => {
  await tester
    .expect(
      `
    ${nsDef}
    ${resource}
    model WidgetProperties {
      props: Record<string>;
    }
    `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-no-record",
      message:
        "Model properties or operation parameters should not be of type Record. ARM requires Resource provider teams to define types explicitly.",
    });
});

it("emits diagnostic when a model extends Record type", async () => {
  await tester
    .expect(
      `
    ${nsDef}
    ${resource}  
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
    ${nsDef}
    ${resource}
    model WidgetProperties is Record<string>;
    `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-no-record",
      message:
        "Models should not equate to type Record. ARM requires Resource provider teams to define types explicitly.",
    });
});

it("does not emit diagnostic when Record is used but not referenced by an ARM resource", async () => {
  await tester
    .expect(
      `
    ${nsDef}
    // should not throw because WidgetProperties is not an ARM resources and is not
    // referenced by an ARM resource.
    model WidgetProperties is Record<string>;
    `
    )
    .toBeValid();
});

it("does not emit diagnostic when Record is used outside an ARM namespace", async () => {
  await tester
    .expect(
      `
    namespace Test {
      model Props is Record<unknown>;

      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Arm {
        model WidgetProperties {};
      }
    }
    `
    )
    .toBeValid();
});

it("emits diagnostic if an ARM Resource references a model that uses Record type", async () => {
  await tester
    .expect(
      `
    namespace NonArm {
      model Properties is Record<string>;

      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Arm {
        ${resource}
  
        model WidgetProperties {
          props: Properties;
        }
      }
    }
    `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-no-record",
      message:
        "Models should not equate to type Record. ARM requires Resource provider teams to define types explicitly.",
    });
});

it("emits diagnostic if an ARM Resource references a subnamespace model that uses Record type", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Arm {
      ${resource}

      model WidgetProperties {
        props: Sub.Properties;
      }

      namespace Sub {
        model Properties is Record<string>;
      }
    }
    `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-no-record",
      message:
        "Models should not equate to type Record. ARM requires Resource provider teams to define types explicitly.",
    });
});

it("does not emit diagnostic if ArmTagsProperty is used", async () => {
  await tester
    .expect(
      `
    ${nsDef}
    ${resource}
    model WidgetProperties {
      ...Foundations.ArmTagsProperty;
    }
    `
    )
    .toBeValid();
});

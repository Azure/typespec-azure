import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
<<<<<<< HEAD
import { armResourceNamePatternRule } from "../../src/rules/arm-resource-name-pattern.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";
=======
import { createAzureResourceManagerTestRunner } from "../test-host.js";
import { armResourceNamePatternRule } from "../../src/rules/arm-resource-name-pattern.js";
>>>>>>> d45f32d (Closes https://github.com/Azure/typespec-azure-pr/issues/3903)

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureResourceManagerTestRunner();
  tester = createLinterRuleTester(
    runner,
    armResourceNamePatternRule,
    "@azure-tools/typespec-azure-resource-manager"
  );
});

it("Emits a warning for an ARM resource that doesn't specify `@pattern` on the name", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        @doc("Name of employee")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }

      @parentResource(Employee)
      model EmployeeRole is ProxyResource<{}> {
        @key("roleName")
        @segment("roles")
        @path
        @visibility("read")
        name: string;
      }
    `
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-name-pattern",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-name-pattern",
      },
    ]);
});

it("Does not emit a warning for an ARM resource that specifies `@pattern` on the name", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;
    
    model Employee is ProxyResource<{}> {
      @doc("Name of employee")
      @pattern("^[a-zA-Z0-9-]{3,24}$")
      @key("employeeName")
      @path
      @segment("employees")
      name: string;
    }`)
    .toBeValid();
});

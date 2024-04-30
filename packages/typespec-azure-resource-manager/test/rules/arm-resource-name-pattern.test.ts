import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { armResourceNamePatternRule } from "../../src/rules/arm-resource-name-pattern.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

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

it("Allows codefix when ARM resource name is missing pattern.", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }
    `
    )
    .applyCodeFix("add-pattern-decorator").toEqual(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;
      
      model Employee is ProxyResource<{}> {
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }
    `);
});

it("Does not emit a warning for an ARM resource that specifies `@pattern` on the name", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;
    
    model Employee is ProxyResource<{}> {
      @pattern("^[a-zA-Z0-9-]{3,24}$")
      @key("employeeName")
      @path
      @segment("employees")
      name: string;
    }
    
    @parentResource(Employee)
    model EmployeeRole is ProxyResource<{}> {
      @key("roleName")
      @segment("roles")
      @pattern("^[a-zA-Z0-9-]{3,24}$")
      @path
      @visibility("read")
      name: string;
    }`
    )
    .toBeValid();
});

it("Does not emit a warning for an ARM resource that specifies `@pattern` on the on the scalar used", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    @pattern("^[a-zA-Z0-9][a-zA-Z0-9-]{1,58}[a-zA-Z0-9]$")
    scalar stringResourceName extends string;

    model Employee is ProxyResource<{}> {
      @key("employeeName")
      @path
      @segment("employees")
      name: stringResourceName;
    }
    `
    )
    .toBeValid();
});

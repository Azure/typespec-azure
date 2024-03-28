import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { lroLocationHeaderRule } from "../../src/rules/lro-location-header.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureResourceManagerTestRunner();
  tester = createLinterRuleTester(
    runner,
    lroLocationHeaderRule,
    "@azure-tools/typespec-azure-resource-manager"
  );
});

it("Emits a warning for LRO 202 response that does not contain a Location header", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;
      model Employee is ProxyResource<EmployeeProperties> {
        @doc("Name of employee")
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }
      model EmployeeProperties {}
      
      @armResourceOperations
      interface Employees {
        @armResourceDelete(Employee)
        delete is ArmResourceDeleteWithoutOkAsync<Employee, EmployeeProperties, LroHeaders = {}>;
      }
    `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/lro-location-header",
    });
});

it("Emits a warning for custom 202 response that does not contain a Location header", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;
      model Employee is ProxyResource<EmployeeProperties> {
        @doc("Name of employee")
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }
      model EmployeeProperties {}
      @armResourceOperations
      interface Employees {
        @armResourceDelete(Employee)
        delete(): { @statusCode _: 202 };
      }
    `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/lro-location-header",
    });
});

it("Does not emit a warning for LRO 202 response that contains the Location response header", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;
      model Employee is ProxyResource<EmployeeProperties> {
        @doc("Name of employee")
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @key("employeeName")
        @path
        @segment("employees")
        name: string;
      }
      model EmployeeProperties {}
      @armResourceOperations
      interface Employees {
        delete is ArmResourceDeleteWithoutOkAsync<Employee, EmployeeProperties>;
      }`
    )
    .toBeValid();
});

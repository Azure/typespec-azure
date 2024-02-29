import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { armDeleteResponseCodesRule } from "../../src/rules/arm-delete-response-codes.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureResourceManagerTestRunner();
  tester = createLinterRuleTester(
    runner,
    armDeleteResponseCodesRule,
    "@azure-tools/typespec-azure-resource-manager"
  );
});

it("Emits a warning for synchronous delete operation that does not contain the appropriate response codes", async () => {
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
        delete(...ApiVersionParameter): {
          @statusCode _: 200;
          result: boolean;
        }
      }
    `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-delete-operation-response-codes",
      message:
        "Synchronous delete operations must have 200, 204 and default responses. They must not have any other responses. Consider using the 'ArmResourceDeleteSync' template.",
    });
});

it("Does not emit a warning for synchronous delete operation that contains the appropriate response codes", async () => {
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
      delete(...ApiVersionParameter): {
        @statusCode _: 200;
        result: boolean;
      } | {
        @statusCode _: 204;
        result: boolean;
      } | ErrorResponse
    }`
    )
    .toBeValid();
});

it("Emits a warning for long-running delete operation that does not contain the appropriate response codes", async () => {
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
        #suppress "deprecated" "test"
        delete is ArmResourceDeleteAsync<Employee>;
      }
    `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-delete-operation-response-codes",
      message:
        "Long-running delete operations must have 202, 204 and default responses. They must not have any other responses. Consider using the 'ArmResourceDeleteWithoutOkAsync' template.",
    });
});

it("Does not emit a warning for long-running delete operation that contains the appropriate response code", async () => {
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
        delete is ArmResourceDeleteWithoutOkAsync<Employee>;
      }`
    )
    .toBeValid();
});

import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { armPutResponseCodesRule } from "../../src/rules/arm-put-response-codes.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureResourceManagerTestRunner();
  tester = createLinterRuleTester(
    runner,
    armPutResponseCodesRule,
    "@azure-tools/typespec-azure-resource-manager"
  );
});

it("Emits a warning for put operation that does not contain the appropriate response codes", async () => {
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
      
      @armResourceOperations
      interface Employees {
        @put
        @armResourceCreateOrUpdate(Employee)
        createOrUpdate(...ApiVersionParameter): {
          @statusCode _: 207;
          result: boolean;
        }
      }
      `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-put-operation-response-codes",
    });
});

it("Emits a warning for put action that does not contain the appropriate response codes", async () => {
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
      
      @armResourceOperations
      interface Employees {
        @put
        @armResourceAction(Employee)
        hire(...ApiVersionParameter): {
          @statusCode _: 207;
          result: boolean;
        }
      }
      `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-put-operation-response-codes",
    });
});

it("Does not emit a warning for put operation that contains the appropriate response codes", async () => {
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
      
      @armResourceOperations
      interface Employees {
        @put
        @armResourceCreateOrUpdate(Employee)
        createOrUpdate(...ApiVersionParameter): {
          @statusCode _: 200;
          result: boolean;
        } | {
          @statusCode _: 201;
          result: boolean;
        } | ErrorResponse;
      }
    `
    )
    .toBeValid();
});

it("Does not emit a warning for operation that uses the 'ArmResourceCreateOrUpdateAsync' template.", async () => {
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
      
      @armResourceOperations
      interface Employees {
        createOrUpdate is ArmResourceCreateOrUpdateAsync<Employee>;
      }
    `
    )
    .toBeValid();
});

it("Does not emit a warning for operation that uses the 'ArmResourceCreateOrReplaceAsync' template.", async () => {
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
      
      @armResourceOperations
      interface Employees {
        createOrReplace is ArmResourceCreateOrReplaceAsync<Employee>;
      }
    `
    )
    .toBeValid();
});

it("Does not emit a warning for operation that uses the 'ArmResourceCreateOrReplaceSync' template.", async () => {
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
      
      @armResourceOperations
      interface Employees {
        createOrReplace is ArmResourceCreateOrReplaceSync<Employee>;
      }
    `
    )
    .toBeValid();
});

it("Does not emit a warning for put action that contains the appropriate response codes", async () => {
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
      
      @armResourceOperations
      interface Employees {
        @put
        @armResourceAction(Employee)
        hire(...ApiVersionParameter): {
          @statusCode _: 200;
          result: boolean;
        } | {
          @statusCode _: 201;
          result: boolean;
        } | ErrorResponse;
      }
    `
    )
    .toBeValid();
});

import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { putOperationEvenSegmentsRule } from "../../src/rules/put-operation-even-segments.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureResourceManagerTestRunner();
  tester = createLinterRuleTester(
    runner,
    putOperationEvenSegmentsRule,
    "@azure-tools/typespec-azure-resource-manager"
  );
});

it("Emits a warning for put operations that don't have an even number of path segments", async () => {
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
      interface Operations {
        @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Employee")
        @armResourceAction(Employee)
        @put operation1(@path subscriptionId: string, @path resourceGroupName: string): void;

        @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Employee/Employees")
        @armResourceAction(Employee)
        @put operation2(@path subscriptionId: string, @path resourceGroupName: string): void;

        @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Employee/Employees/{employeeName}/Contact")
        @armResourceAction(Employee)
        @put operation3(@path subscriptionId: string, @path resourceGroupName: string, @path employeeName: string): void;

        @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Employee/Employees/{employeeName}/Contact/addContactName")
        @armResourceAction(Employee)
        @put operation4(@path subscriptionId: string, @path resourceGroupName: string, @path employeeName: string): void;

        @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Employee/Employees/{employeeName}/Contact/{contactName}/addContact")
        @armResourceAction(Employee)
        @put operation5(@path subscriptionId: string, @path resourceGroupName: string, @path employeeName: string, @path contactName: string): void;

        @route("{resourceUri}/providers/Microsoft.Employee/Employees/{employeeName}/Contact/{contactName}/addContact")
        @armResourceAction(Employee)
        @put operation6(@path resourceUri: string, @path employeeName: string, @path contactName: string): void;

        @route("{resourceUri}/providers/Microsoft.Employee/Employees/{employeeName}/Contact/{contactName}/addContact")
        @armResourceAction(Employee)
        @put operation7(@path resourceUri: string, @path employeeName: string, @path contactName: string): void;

        @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Employee/Employees/{employeeName}/providers/Microsoft.Contact/Contacts")
        @armResourceAction(Employee)
        @put operation8(@path subscriptionId: string, @path resourceGroupName: string, @path employeeName: string, @path contactName: string): void;

        @route("/providers/Microsoft.Employee/Employees/{employeeName}/Contact/{contactName}/addContact")
        @armResourceAction(Employee)
        @put operation9(@path employeeName: string, @path contactName: string): void;

        @route("/providers/Microsoft.Employee/Employees")
        @armResourceAction(Employee)
        @put operation10(): void;
      }`
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/put-operation-even-segments",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/put-operation-even-segments",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/put-operation-even-segments",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/put-operation-even-segments",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/put-operation-even-segments",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/put-operation-even-segments",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/put-operation-even-segments",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/put-operation-even-segments",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/put-operation-even-segments",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/put-operation-even-segments",
      },
    ]);
});

it("Does not emit a warning for put operations that have an even number of path segments", async () => {
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
      interface Operations {
        @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Employee/Employees/{employeeName}")
        @armResourceUpdate(Employee)
        @put operation1(@path subscriptionId: string, @path resourceGroupName: string, @path employeeName: string): void;  
        
        @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Employee/Employees/{employeeName}/Contact/{contactName}")
        @armResourceUpdate(Employee)
        @put operation2(@path subscriptionId: string, @path resourceGroupName: string, @path employeeName: string, @path contactName: string): void;

        @route("/{resourceUri}/providers/Microsoft.Employee/Employees/{employeeName}")
        @armResourceUpdate(Employee)
        @put operation3(@path resourceUri: string, @path employeeName: string): void;

        @route("/{resourceUri}/providers/Microsoft.Employee/Employees/{employeeName}/Contact/{contactName}")
        @armResourceUpdate(Employee)
        @put operation4(@path resourceUri: string, @path employeeName: string, @path contactName: string): void;

        @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Employee/Employees/{employeeName}/providers/Microsoft.Contact/Contacts/{contactName}")
        @armResourceUpdate(Employee)
        @put operation5(@path subscriptionId: string, @path resourceGroupName: string, @path employeeName: string, @path contactName: string): void;

        @route("/providers/Microsoft.Employee/Employees/{employeeName}")
        @armResourceUpdate(Employee)
        @put operation6(@path employeeName: string): void;  

        @route("/providers/Microsoft.Employee/Employees/{employeeName}/Contact/{contactName}")
        @armResourceUpdate(Employee)
        @put operation7(@path employeeName: string, @path contactName: string): void;
      }`
    )
    .toBeValid();
});

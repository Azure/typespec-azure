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
        @armResourceUpdate(Employee)
        @put operation1(@path subscriptionId: string, @path resourceGroupName: string, @path employeeName: string): void;  
      }
      // "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Music"
      // "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Music/Songs"
      // "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Music/Songs/{songName}/Artist"
      // "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Music/Songs/{songName}/Artist/addArtistName"
      // "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Music/Songs/{songName}/Artist/{artistName}/addSong"
      // "{resourceUri}/providers/Microsoft.Music/Songs/{songName}/Artist/{artistName}/addSong"
      // "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Music/Songs/{songName}/providers/Microsoft.Album/Albums"
      // "/providers/Microsoft.Music/Songs/{songName}/Artist/{artistName}/addSong"
      // "/providers/Microsoft.Music/Songs"      `
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/put-operation-even-segments",
    });
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

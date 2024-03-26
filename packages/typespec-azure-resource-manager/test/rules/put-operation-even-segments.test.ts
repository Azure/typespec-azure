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

      @armResourceOperations
      interface Operations {
        @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Music/Songs/{songName}")
        operation1(@path subscriptionId: string, @path resourceGroupName: string, @path songName: string): void;  
      }
      // "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Music/Songs/{songName}/Artist/{artistName}"
      // "/{resourceUri}/providers/Microsoft.Music/Songs/{songName}"
      // "{resourceUri}/providers/Microsoft.Music/Songs/{songName}/Artist/{artistName}"
      // "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Music/Songs/{songName}/providers/Microsoft.Album/Albums/{albumName}"
      // "/providers/Microsoft.Music/Songs/{songName}"
      // "/providers/Microsoft.Music/Songs/{songName}/Artist/{artistName}"
      `
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

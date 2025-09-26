import { t } from "@typespec/compiler/testing";
import { getHttpOperation } from "@typespec/http";
import { strictEqual } from "assert";
import { it } from "vitest";
import { Tester } from "./tester.js";

it("singleton resource route check", async () => {
  const { program, Foos, RenamedFoos, renamedGet } = await Tester.compile(t.code`
    @armProviderNamespace
    namespace Microsoft.Test {
      enum ResourceState {
        Succeeded,
        Canceled,
        Failed
      }

      model FooResourceProperties {
        displayName?: string = "default";
        provisioningState: ResourceState;
      }

      @singleton
      model FooResource is TrackedResource<FooResourceProperties> {
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }
      
      @armResourceOperations
      interface ${t.interface("Foos")} {
        get is ArmResourceRead<FooResource>;
      }
    }

    namespace Customization {
      interface ${t.interface("RenamedFoos")} extends Microsoft.Test.Foos {}

      interface NewFoos {
        ${t.op("renamedGet")} is Microsoft.Test.Foos.get;
      }
    }
  `);

  strictEqual(
    getHttpOperation(program, Foos.operations.get("get")!)[0].path,
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/default",
  );

  strictEqual(
    getHttpOperation(program, RenamedFoos.operations.get("get")!)[0].path,
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/default",
  );

  strictEqual(
    getHttpOperation(program, renamedGet)[0].path,
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/default",
  );
});

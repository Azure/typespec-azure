import { Interface, Operation } from "@typespec/compiler";
import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { getHttpOperation } from "@typespec/http";
import { strictEqual } from "assert";
import { it } from "vitest";
import { compileAndDiagnose } from "./test-host.js";

it("singleton resource route check", async () => {
  const { program, types, diagnostics } = await compileAndDiagnose(`
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Test {
      @doc("The state of the resource")
      enum ResourceState {
      @doc(".") Succeeded,
      @doc(".") Canceled,
      @doc(".") Failed
      }

      @doc("Foo properties")
      model FooResourceProperties {
        @doc("Name of the resource")
        displayName?: string = "default";
        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      @singleton
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("foo name")
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }
      
      @armResourceOperations
      #suppress "deprecated" "test"
      @test
      interface Foos {
        get is ArmResourceRead<FooResource>;
      }
    }

    namespace Customization {
      @test
      interface RenamedFoos extends Microsoft.Test.Foos {}

      interface NewFoos {
        @test
        renamedGet is Microsoft.Test.Foos.get;
      }
    }
  `);

  const { Foos, RenamedFoos, renamedGet } = types as {
    Foos: Interface;
    RenamedFoos: Interface;
    renamedGet: Operation;
  };

  expectDiagnosticEmpty(diagnostics);

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

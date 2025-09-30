import { Tester } from "#test/tester.js";
import { expectDiagnosticEmpty, expectDiagnostics, t } from "@typespec/compiler/testing";
import { expect, it } from "vitest";
import { getArmIdentifiers } from "../../resource.js";

it("allows multiple model properties in identifiers decorator", async () => {
  const diagnostics = await Tester.diagnose(`
    model Dog {
      name: string;
      age: int32;
    }
    
    model Pets {
      @identifiers(#["name", "age"])
      dogs: Dog[];
    }
`);

  expectDiagnosticEmpty(diagnostics);
});

it("can be used on a array model", async () => {
  const { Pets, program } = await Tester.compile(t.code`
    model Dog {
      name: string;
      age: int32;
    }
    
    @identifiers(#["name"])
    model ${t.model("Pets")} is Dog[];
`);

  expect(getArmIdentifiers(program, Pets)).toEqual(["name"]);
});

it("allows inner model properties in identifiers decorator", async () => {
  const diagnostics = await Tester.diagnose(`
    @armProviderNamespace
    namespace Microsoft.Contoso;

    model Dog {
      breed: Breed;
    }
    
    model Breed {
      type: string;
    }
    
    model Pets
    {
      @identifiers(#["breed/type"])
      dogs: Dog[];
    }
`);

  expectDiagnosticEmpty(diagnostics);
});

it("emits diagnostic when identifiers is not of a model property object array", async () => {
  const diagnostics = await Tester.diagnose(`
    model Dog {
      name: string;
    }
    
    model Pets
    {
      @identifiers(#["age"])
      dogs: Dog;
    }
`);

  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-resource-manager/decorator-param-wrong-type",
    message: "The @identifiers decorator must be applied to a property that is an array of objects",
  });
});

it("emits diagnostic when used on non array model", async () => {
  const diagnostics = await Tester.diagnose(`
    @identifiers(#["name"])
    model Pets {
      dogs: string[];
    }
`);

  expectDiagnostics(diagnostics, {
    code: "decorator-wrong-target",
    message:
      "Cannot apply @identifiers decorator to Pets since it is not assignable to ModelProperty | unknown[]",
  });
});

it("emits diagnostics when a provider cannot be updated", async () => {
  const diagnostics = await Tester.diagnose(`
    @armProviderNamespace
    @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
    namespace Microsoft.ContosoProviderHub {

      @armResourceOperations
      interface VirtualMachines {
        @armResourceRead(Azure.ResourceManager.Extension.VirtualMachine)
        @get op read(
        ...ApiVersionParameter;
        ...Extension.TargetProviderNamespace<Azure.ResourceManager.Extension.VirtualMachine>;
        ...KeysOf<Azure.ResourceManager.Extension.VirtualMachine>): void;
      }

    }

    namespace Azure.ResourceManager.Extension {
      model VirtualMachine {
      @visibility(Lifecycle.Read) @path @key @segment("virtualMachines") vmName: string;
      }
    }
    `);

  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-azure-resource-manager/resource-without-provider-namespace",
      message: `The resource "VirtualMachine" does not have a provider namespace.  Please use a resource in a namespace marked with '@armProviderNamespace' or a virtual resource with a specific namespace`,
    },
    {
      code: "@azure-tools/typespec-azure-resource-manager/resource-without-provider-namespace",
      message: `The resource "VirtualMachine" does not have a provider namespace.  Please use a resource in a namespace marked with '@armProviderNamespace' or a virtual resource with a specific namespace`,
    },
  ]);
});

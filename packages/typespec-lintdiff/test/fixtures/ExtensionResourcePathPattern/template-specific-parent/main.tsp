import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024_01_01: "2024-01-01",
}

/** An extension binding. */
model Binding is Azure.ResourceManager.ExtensionResource<BindingProperties> {
  ...ResourceNameParameter<Binding>;
}

/** Binding properties. */
model BindingProperties {
  /** A label for the binding. */
  label?: string;
}

alias VirtualMachine = Extension.ExternalResource<"Microsoft.Compute", "virtualMachines", "vmName">;

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Bindings {
  read is Extension.Read<VirtualMachine, Binding>;
}

Resources must have unique logical names across all ARM services in a program. This rule checks
the `resourceName` values returned by `resolveArmResources`, not the `name` property of a resource
instance or its ARM resource type.

The same model can describe several resource occurrences at different scopes or paths. Give each
occurrence a unique name when instantiating its operations.

## Incorrect

The following example describes an Employee extension on a VM and on a VM in a scale set. Both
target paths end in `"virtualMachines", "vmName"`. The target models are both named `Target`,
in separate namespaces, so both Employee occurrences default to `TargetEmployee`.

```typespec
import "@azure-tools/typespec-azure-resource-manager";

using Azure.ResourceManager;

@armProviderNamespace
namespace Microsoft.Contoso;

model Employee is ExtensionResource<{}> {
  ...ResourceNameParameter<Employee>;
}

alias VirtualMachine = Extension.ExternalResource<"Microsoft.Compute", "virtualMachines", "vmName">;
alias ScaleSet = Extension.ExternalResource<
  "Microsoft.Compute",
  "virtualMachineScaleSets",
  "scaleSetName"
>;
alias ScaleSetVm = Extension.ExternalChildResource<ScaleSet, "virtualMachines", "vmName">;

namespace Vm {
  model Target is VirtualMachine;
}

namespace ScaleSetVmScope {
  model Target is ScaleSetVm;
}

interface EmployeeOperations<Scope extends Azure.ResourceManager.Foundations.SimpleResource> {
  get is Extension.Read<Scope, Employee>;
  list is Extension.ListByTarget<Scope, Employee>;
}

@armResourceOperations
interface VmEmployees extends EmployeeOperations<Vm.Target> {}

@armResourceOperations
interface ScaleSetVmEmployees extends EmployeeOperations<ScaleSetVmScope.Target> {}
```

## Correct

Keep the models and paths unchanged. Add a `ResourceName` parameter to the shared operations
template and forward it to every operation through `OverrideResourceName`. Supply a distinct
logical name when instantiating each concrete operations interface:

```typespec
interface EmployeeOperations<
  Scope extends Azure.ResourceManager.Foundations.SimpleResource,
  ResourceName extends valueof string
> {
  get is Extension.Read<Scope, Employee, OverrideResourceName = ResourceName>;
  list is Extension.ListByTarget<Scope, Employee, OverrideResourceName = ResourceName>;
}

@armResourceOperations
interface VmEmployees extends EmployeeOperations<Vm.Target, "VmEmployee"> {}

@armResourceOperations
interface ScaleSetVmEmployees
  extends EmployeeOperations<ScaleSetVmScope.Target, "ScaleSetVmEmployee"> {}
```

For standard resource operations, specific extensions, legacy templates, and resources at different
scopes, see [Authoring resource metadata](../../../howtos/ARM/resource-metadata.md).

## Impact

- **Area:** Emitters, Bicep, provisioning libraries

Downstream consumers use logical resource names as generated type names, file names, or lookup
keys. Duplicate names can overwrite or drop resource declarations, producing incorrect Bicep
resource metadata, templates, and provisioning libraries even when the HTTP paths are distinct.

## Suppression

Do not suppress this rule. Duplicate metadata names make downstream resource consumers incorrect.
Provide explicit, unique names on the resource operations instead; this fixes the metadata without
changing the wire API.

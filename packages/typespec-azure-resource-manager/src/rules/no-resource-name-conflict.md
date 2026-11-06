Resources must have unique logical names across all ARM services in a program.

The same model can describe several resource occurrences at different scopes or paths. Give each
occurrence a unique name when instantiating its operations.

## Incorrect

The following example describes RunCommand resources under a VM and under a VM in a scale set.
The ARM resource types are `Microsoft.Compute/virtualMachines/runCommands` and
`Microsoft.Compute/virtualMachineScaleSets/virtualMachines/runCommands`. The legacy operation
templates derive their default logical names from the last two resource-type segments, so both
occurrences are named `VirtualMachinesRunCommands`.

```typespec
import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using Azure.ResourceManager;

@armProviderNamespace
namespace Microsoft.Compute;

model RunCommandProperties {
  /** The command to execute on the virtual machine. */
  command?: string;
}

model RunCommand is ProxyResource<RunCommandProperties> {
  ...ResourceNameParameter<RunCommand>;
}

alias VmParameters = {
  ...ApiVersionParameter;
  ...SubscriptionIdParameter;
  ...ResourceGroupParameter;
  ...Legacy.Provider;

  @path
  @key
  @segment("virtualMachines")
  vmName: string;
};

alias ScaleSetVmParameters = {
  ...ApiVersionParameter;
  ...SubscriptionIdParameter;
  ...ResourceGroupParameter;
  ...Legacy.Provider;

  @path
  @key
  @segment("virtualMachineScaleSets")
  scaleSetName: string;

  @path
  @key
  @segment("virtualMachines")
  vmName: string;
};

alias RunCommandParameters = {
  @path
  @key
  @segment("runCommands")
  commandName: string;
};

interface RunCommandOperations<ParentParameters extends {}>
  extends Legacy.LegacyOperations<ParentParameters, RunCommandParameters> {}

alias VmOperations = RunCommandOperations<VmParameters>;
alias ScaleSetVmOperations = RunCommandOperations<ScaleSetVmParameters>;

@armResourceOperations
interface VmRunCommands {
  get is VmOperations.Read<RunCommand>;
  list is VmOperations.List<RunCommand>;
}

@armResourceOperations
interface ScaleSetVmRunCommands {
  get is ScaleSetVmOperations.Read<RunCommand>;
  list is ScaleSetVmOperations.List<RunCommand>;
}
```

## Correct

Keep the models and paths unchanged. Add a `ResourceName` parameter to the shared operations
template and forward it to `Legacy.LegacyOperations`. Supply a distinct name when instantiating
the template for each resource occurrence. This replaces the operations declarations above:

```typespec
interface RunCommandOperations<ParentParameters extends {}, ResourceName extends valueof string>
  extends Legacy.LegacyOperations<
      ParentParameters,
      RunCommandParameters,
      ResourceName = ResourceName
    > {}

alias VmOperations = RunCommandOperations<VmParameters, "VmRunCommand">;
alias ScaleSetVmOperations = RunCommandOperations<ScaleSetVmParameters, "ScaleSetVmRunCommand">;

@armResourceOperations
interface VmRunCommands {
  get is VmOperations.Read<RunCommand>;
  list is VmOperations.List<RunCommand>;
}

@armResourceOperations
interface ScaleSetVmRunCommands {
  get is ScaleSetVmOperations.Read<RunCommand>;
  list is ScaleSetVmOperations.List<RunCommand>;
}
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

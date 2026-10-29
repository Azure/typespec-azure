---
title: Authoring resource metadata
---

ARM resource metadata describes the resources exposed by a TypeSpec service to consumers such as
Bicep and provisioning libraries. Correct HTTP routes are necessary, but not sufficient: each
resource occurrence also needs a unique logical resource name.

For the API used by emitter authors to read this metadata, see
[Getting resource information from ARM specs](./getting-resource-information.md).

## Resource identity and logical names

| Value                  | Meaning                                                     | Example                                                                                |
| ---------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Resource model         | TypeSpec model describing the resource payload              | `Employee`                                                                             |
| Logical resource name  | `ResolvedResource.resourceName`, used by metadata consumers | `VmEmployee`                                                                           |
| ARM resource type      | Provider and collection segments on the wire                | `Microsoft.Contoso/employees`                                                          |
| Resource instance path | Full path, including scope and parent parameters            | `/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/employees/{employeeName}` |
| Resource instance name | A particular deployed resource's `name` value               | `alice`                                                                                |

One resource model can describe several occurrences, such as a resource available at both tenant
and subscription scope, or an extension applied to several target resource types. Those occurrences
can have the same ARM resource type but must have distinct logical resource names.

Explicit logical names do not change HTTP paths, ARM resource type segments, resource instance
names, serialized properties, or scope relationships. Changing a collection segment or key parameter
to resolve a logical-name collision is not the correct fix.

## Instantiate a resource and its operations

Declare a concrete resource model using a supported resource template, include its name parameter,
and instantiate resource operation templates in an `@armResourceOperations` interface:

```typespec
import "@azure-tools/typespec-azure-resource-manager";

using Azure.ResourceManager;

@armProviderNamespace
namespace Microsoft.Contoso;

model Employee is ProxyResource<{}> {
  ...ResourceNameParameter<Employee>;
}

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  create is ArmResourceCreateOrReplaceSync<Employee>;
  delete is ArmResourceDeleteSync<Employee>;
  list is ArmResourceListByParent<Employee>;
}
```

The standard operations use the concrete model name, `Employee`, as the default logical resource
name. A resolved occurrence needs a read or create-or-update operation to establish its instance
path. Several operations on that same occurrence do not create several resources.

Use the corresponding ARM operation decorator to supply an explicit logical name for standard
operations. Keep the name consistent on every operation for that occurrence:

```typespec
@armResourceOperations
interface Employees {
  @armResourceRead(Employee, "ManagedEmployee")
  get is ArmResourceRead<Employee>;

  @armResourceCreateOrUpdate(Employee, "ManagedEmployee")
  create is ArmResourceCreateOrReplaceSync<Employee>;

  @armResourceDelete(Employee, "ManagedEmployee")
  delete is ArmResourceDeleteSync<Employee>;

  @armResourceList(Employee, "ManagedEmployee")
  list is ArmResourceListByParent<Employee>;
}
```

This interface replaces the earlier `Employees` interface; do not declare both together.

## Name specific extension resources

Specific extension operations take a target resource and an extension resource. By default their
logical name is composed from the target model name and extension model name; the generic
`Extension.ScopeParameter` target uses the extension model name alone. Alias identifiers do not
necessarily rename their underlying template models.

Expose a logical-name parameter on a shared operations interface and forward it to every operation
using `OverrideResourceName`. Supply a distinct value each time the interface is instantiated:

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

interface EmployeeOperations<
  Scope extends Azure.ResourceManager.Foundations.SimpleResource,
  ResourceName extends valueof string
> {
  get is Extension.Read<Scope, Employee, OverrideResourceName = ResourceName>;
  list is Extension.ListByTarget<Scope, Employee, OverrideResourceName = ResourceName>;
}

@armResourceOperations
interface VmEmployees extends EmployeeOperations<VirtualMachine, "VmEmployee"> {}

@armResourceOperations
interface ScaleSetVmEmployees extends EmployeeOperations<ScaleSetVm, "ScaleSetVmEmployee"> {}
```

The VM and scale-set VM targets both end in `"virtualMachines", "vmName"`, but their full instance
paths are different. The Employee occurrences are explicitly named `VmEmployee` and
`ScaleSetVmEmployee`. The target resource aliases and wire paths are unchanged.

Forward the same name through `OverrideResourceName` for any create, update, delete, or action
templates added to the shared interface.

### Resources at different scopes

The same interface can describe an Employee at each supported scope. Give each occurrence its own
name rather than depending on operation interface names:

```typespec
@armResourceOperations
interface TenantEmployees extends EmployeeOperations<Extension.Tenant, "TenantEmployee"> {}

@armResourceOperations
interface SubscriptionEmployees
  extends EmployeeOperations<Extension.Subscription, "SubscriptionEmployee"> {}

@armResourceOperations
interface ResourceGroupEmployees
  extends EmployeeOperations<Extension.ResourceGroup, "ResourceGroupEmployee"> {}

@armResourceOperations
interface ManagementGroupEmployees
  extends EmployeeOperations<Extension.ManagementGroup, "ManagementGroupEmployee"> {}

@armResourceOperations
interface ServiceGroupEmployees
  extends EmployeeOperations<Extension.ServiceGroup, "ServiceGroupEmployee"> {}

@armResourceOperations
interface ScopedEmployees extends EmployeeOperations<Extension.ScopeParameter, "ScopedEmployee"> {}
```

These declarations extend the previous extension-resource example. Fixed scopes and a generic
`{scope}` path represent different occurrences even when the extension resource type is identical.

## Name resources in existing legacy templates

For existing specifications using `Azure.ResourceManager.Legacy.LegacyOperations`, set its
`ResourceName` parameter. The default derives a name from only the last two resource-type segments,
so different paths can produce the same name. For example, both
`Microsoft.Compute/virtualMachines/runCommands` and
`Microsoft.Compute/virtualMachineScaleSets/virtualMachines/runCommands` default to
`VirtualMachinesRunCommands`.

The following example supplies explicit names at subscription and tenant scope:

```typespec
import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using Azure.ResourceManager;

@armProviderNamespace
namespace Microsoft.Contoso;

model Employee is ProxyResource<{}> {
  ...ResourceNameParameter<Employee>;
}

alias SubscriptionEmployeeOperations = Legacy.LegacyOperations<
  {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
    ...Legacy.Provider;
  },
  {
    @path
    @key
    @segment("employees")
    employeeName: string;
  },
  ResourceName = "SubscriptionEmployee"
>;

alias TenantEmployeeOperations = Legacy.LegacyOperations<
  {
    ...ApiVersionParameter;
    ...Legacy.Provider;
  },
  {
    @path
    @key
    @segment("employees")
    employeeName: string;
  },
  ResourceName = "TenantEmployee"
>;

@armResourceOperations
interface SubscriptionEmployees {
  get is SubscriptionEmployeeOperations.Read<Employee>;
  list is SubscriptionEmployeeOperations.List<Employee>;
}

@armResourceOperations
interface TenantEmployees {
  get is TenantEmployeeOperations.Read<Employee>;
  list is TenantEmployeeOperations.List<Employee>;
}
```

Other legacy templates expose the same naming mechanism at different levels:

| Template                     | Interface-level name | Per-operation override |
| ---------------------------- | -------------------- | ---------------------- |
| `Legacy.LegacyOperations`    | `ResourceName`       | `OverrideResourceName` |
| `Legacy.RoutedOperations`    | `RoutedResourceName` | `OverrideResourceName` |
| `Legacy.ExtensionOperations` | `ResourceName`       | `OverrideResourceName` |

Forward an explicit interface-level name consistently to all operations. A per-operation
`OverrideResourceName` takes precedence for that operation, so do not accidentally give operations
for one occurrence inconsistent names. Use supported standard or specific-extension templates for
new specifications rather than introducing legacy templates solely for naming.

## Check names before consuming the metadata

The [`no-resource-name-conflict`](../../libraries/azure-resource-manager/rules/no-resource-name-conflict.md)
rule checks exact logical-name collisions across the ARM services in a compiled program. It uses
the declaration view, not a selected API version, and excludes synthetic external parents without
resource operations.

Do not suppress this rule. Bicep and provisioning consumers may use resource names as type names,
file names, or keys. Duplicate names can overwrite generated declarations or drop a resource from
the generated output. Fix collisions by supplying unique logical names, without changing the wire
contract.

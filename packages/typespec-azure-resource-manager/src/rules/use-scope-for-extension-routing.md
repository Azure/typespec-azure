For Resource Provider as a Service (RPaaS) extension-routing contracts, accept an
arbitrary scope instead of embedding a specific parent resource URI. RPaaS does
not forward that parent URI to the provider-side extension route.

This opt-in rule warns when an operation's resolved HTTP path contains more than
one literal, case-sensitive `/providers/` segment. It reports once per concrete
operation, including inherited endpoints, and skips uninstantiated templates.
It checks the supplied program, not a selected API-version projection.

This is **not a general ARM path restriction**. Specific-parent extension paths
are supported ordinary ARM endpoints. Leave this rule disabled unless the
authored contract is intended for RPaaS extension routing.

## Enable explicitly

The rule is disabled in the ARM library's `all` ruleset and in the general Azure
resource-manager ruleset. Enable it for the appropriate contract in
`tspconfig.yaml`:

```yaml
linter:
  enable:
    "@azure-tools/typespec-azure-resource-manager/use-scope-for-extension-routing": true
```

Enablement supplies the audience decision. The rule does not detect deployment
configuration or require provider-namespace metadata.

## Impact

- **Area:** API, SDK

Embedding a parent URI in a provider-side extension route can make the route
incompatible with RPaaS routing and produce unusable client operations.
This impact applies to opted-in RPaaS contracts, not ordinary ARM endpoints.

## ❌ Incorrect

The extension read operation embeds a specific virtual machine's parent URI.
The examples use the standard ARM imports and `using` declarations.

```tsp
@armProviderNamespace
@service
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.Test;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024: "2024-01-01",
}

model Binding is ExtensionResource<BindingProperties> {
  ...ResourceNameParameter<Binding>;
}

model BindingProperties {
  label?: string;
}

alias VirtualMachine = Extension.ExternalResource<"Microsoft.Compute", "virtualMachines", "vmName">;

@armResourceOperations
interface Bindings {
  read is Extension.Read<VirtualMachine, Binding>;
}
```

## ✅ Correct

Accept an arbitrary scope with the same resource and read operation.

```tsp
@armProviderNamespace
@service
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.Test;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024: "2024-01-01",
}

model Binding is ExtensionResource<BindingProperties> {
  ...ResourceNameParameter<Binding>;
}

model BindingProperties {
  label?: string;
}

@armResourceOperations
interface Bindings {
  read is Extension.Read<Extension.ScopeParameter, Binding>;
}
```

## Suppression

For ordinary ARM contracts, leave the rule disabled rather than suppressing
supported endpoints individually. For an intentional RPaaS routing exception
approved by the service's routing reviewers, suppress the fully qualified rule
on the offending operation with a reason documenting that approval.

## LintDiff Equivalent

This rule corresponds to
[R4038 ExtensionResourcePathPattern](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r4038).
The original validator implementation is documented in
[ExtensionResourcePathPattern](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/docs/extension-resource-path-pattern.md).
The native rule reports per authored concrete operation rather than per emitted
path, so separate verbs on one path can produce separate warnings.

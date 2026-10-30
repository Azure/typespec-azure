---
validatorRuleId: ExtensionResourcePathPattern
engine: native
coverageKind: lint
tspLints:
  - tsp-lintdiff-local-linter/extension-resource-path-pattern
tspRuleset: resource-manager
---

# Extension resource paths for RPaaS

**Applicability:** Explicitly selected RPaaS extension-routing contracts.

**Native severity:** warning

## Requirement

When authoring the extension-routing contract consumed by Resource Provider as a
Service (RPaaS), use an arbitrary scope parameter instead of embedding the parent
resource's URI. RPaaS does not forward that parent URI as part of the provider-side
route. The rule warns on HTTP operation paths with more than one literal
`/providers/` segment and targets each offending operation.

This is **not a general ARM path restriction**. Specific-parent paths produced by
`Extension.Read<Extension.ExternalResource<...>, Resource>` or management-group
extension templates are supported ARM management-plane authoring. Do not enable
this policy for those endpoints unless they are intended as RPaaS extension-routing
contracts.

## Enable explicitly

The rule is registered but disabled in the local `recommended` and `all`
rulesets. Select the policy for the appropriate contract in `tspconfig.yaml`:

```yaml
linter:
  enable:
    tsp-lintdiff-local-linter/extension-resource-path-pattern: true
```

Enablement supplies the applicability decision. The rule does not detect RPaaS
deployment, inspect a readme or emitter configuration, or require a provider
namespace decorator. Disable it for a project containing only ordinary ARM
management-plane contracts.

## Incorrect for an RPaaS extension-routing contract

The resource and operation use supported ARM templates, but the chosen target
embeds a specific virtual machine's parent URI.

```tsp
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

## Correct for an RPaaS extension-routing contract

Use the arbitrary-scope target with the same resource and read operation.

```tsp
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

Both snippets assume the standard imports, `using Azure.ResourceManager`,
and a service/provider namespace. Their actual operations are compiled and
checked by the native documentation-example test.

## Diagnostic and version scope

Each offending operation gets one warning, even if its path contains three or
more provider segments. Two verbs on one path get two operation warnings.
Uninstantiated operation and generic-interface templates are skipped because
they do not represent emitted endpoints; instantiated operations remain checked.
The rule checks declarations in the supplied semantic program, not a
latest-API-version projection or a historical emitted schema. Literal matching
is case-sensitive, consistent with the standard lowercase ARM `providers`
segment.

## LintDiff Equivalent

- linter code: [ExtensionResourcePathPattern](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/native/legacyRules/ExtensionResourcePathPattern.ts)
- linter doc: [extension-resource-path-pattern.md](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/docs/extension-resource-path-pattern.md)

**Severity:** error

**Applies to:** Both ARM and DataPlane (retained catalog classification, not native applicability).

The catalog's `Both` label comes from legacy extraction classifying RPaaS rules
as `common`. The validator actually selects this rule only for caller-provided
`OpenApiTypes.rpaas`; its docs describe ARM Swagger consumed in that context.
Native applicability is the explicit opt-in described above, not that catalog
label. General ARM corpus output is not an RPaaS-selection equivalent.

The validator reports one finding per emitted path, whereas the native rule
reports per operation. The focused fixtures opt in through their rule-local
configuration, and the comparison worker preserves that explicit enablement.
See [migration evidence](./migration.md) for results and population limitations.

Promotion should preserve this opt-in contract and leave the official rule
disabled by default. No RPaaS detector or additional semantic decorator is needed.

---
validatorRuleId: ImplementPrivateEndpointAPIs
engine: native
tspLints:
  - tsp-lintdiff-local-linter/implement-private-endpoint-apis
coverageKind: lint
---

# ImplementPrivateEndpointAPIs

**Severity:** warning

**Applies to:** Resource Manager (ARM)

## Description

An ARM resource that exposes a private endpoint API must expose all three paths:

- `/privateEndpointConnections/{privateEndpointConnectionName}`
- `/privateEndpointConnections`
- `/privateLinkResources`

Once any path is present for a resource, add the other two. A service with no private
endpoint APIs does not need to add them. The rule checks path presence, not the
HTTP methods available at each path.

Use `PrivateEndpoints` for connection operations and `PrivateLinks` for link
discovery. A registered `ArmResourceActionSync` operation with a matching path also
counts. The rule checks registered ARM lifecycle, list, and action operations.
Registered operations from legacy templates also count, including operations on
custom resource models. Each parent path has its own three-path requirement.
It reports each missing path once, on an interface that exposes an existing path
(or its operation when there is no interface).

## Incorrect

With the service, resource, and aliases from `common.tsp`, this interface is missing
the private link resource collection.

```typespec
@armResourceOperations
interface Widgets {
  getPrivateEndpointConnection is WidgetPrivateEndpointConnections.Read<Widget>;
  listPrivateEndpointConnections is WidgetPrivateEndpointConnections.ListByParent<Widget>;
}
```

## Correct

Add the matching private link resource collection for the same parent resource.

```typespec
@armResourceOperations
interface Widgets {
  getPrivateEndpointConnection is WidgetPrivateEndpointConnections.Read<Widget>;
  listPrivateEndpointConnections is WidgetPrivateEndpointConnections.ListByParent<Widget>;
  listPrivateLinkResources is WidgetPrivateLinks.ListByParent<Widget>;
}
```

## Activation and limitations

The local `tsp-lintdiff-local-linter/all` ruleset enables this rule. Its ARM operation
metadata boundary excludes unregistered custom HTTP routes. Do not add a provider
namespace guard to the predicate: ARM operation registration already defines its
input population. The recommended official destination is
`@azure-tools/typespec-azure-resource-manager`, with the new rule disabled by default.

The check uses the compiled program's registered operations. It does not construct
historical service-version projections. See [migration evidence](./migration.md)
for the selected-version comparison and remaining limits.

## LintDiff Equivalent

- linter code: [ImplementPrivateEndpointAPIs](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/native/functions/implement-private-endpoint-apis.ts)
- linter doc: [implement-private-endpoint-ap-is.md](https://github.com/Azure/azure-openapi-validator/blob/main/docs/implement-private-endpoint-ap-is.md)

The upstream rule is registered for ordinary ARM (`azArm`, `OpenApiTypes.arm`),
not RPaaS. It recognizes the three path suffixes without checking verbs and
groups them by an exact parent prefix. The native check uses supported ARM
operation metadata instead of emitted documents. Unregistered custom routes
remain outside the native contract.

The existing official ARM rules and independently selectable `PrivateEndpoints`
and `PrivateLinks` templates do not enforce the complete three-path requirement.
The related `nested-resources-must-have-list-operation` rule reports a different
requirement in `missing-private-endpoint-list`; that warning remains in its snapshot.

## Test Cases

| ID                               | Violation | Description                                                                                    |
| -------------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `missing-private-endpoint`       | yes       | Private endpoint point + collection APIs exist, but `privateLinkResources` is missing          |
| `missing-private-endpoint-list`  | yes       | Private endpoint point API and `privateLinkResources` exist, but the collection API is missing |
| `missing-private-endpoint-point` | yes       | Private endpoint collection API and `privateLinkResources` exist, but the point API is missing |
| `private-endpoint-point-only`    | yes       | Only the point private endpoint connection API is present                                      |
| `private-endpoint-list-only`     | yes       | Only the private endpoint connection collection API is present                                 |
| `private-link-only`              | yes       | Only the `privateLinkResources` API is present                                                 |
| `compliant`                      | no        | All three required private endpoint API shapes are present                                     |
| `no-private-endpoints`           | no        | Standard ARM service without private endpoints stays out of scope                              |
| `action-compliant`               | no        | The private link collection uses a supported GET action template                               |
| `action-link-only`               | yes       | A GET action supplies only the private link collection, so both connection paths are missing   |

Compliance expectations list the reviewed unrelated warnings from the shared
fixture setup: common-type version, description, parameter constraints, missing
patch operation, and examples. `action-compliant` also retains the collection
paging warning caused by its GET action lacking paging metadata. None prevents
compilation or supplies the target rule's private endpoint checks.

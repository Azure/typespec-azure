An ARM resource that exposes a private endpoint API must expose all three paths:

- `/privateEndpointConnections/{privateEndpointConnectionName}`
- `/privateEndpointConnections`
- `/privateLinkResources`

Once any path exists for a parent resource, add the other two. A service without
private endpoint APIs does not need to add them. The rule checks path presence,
not which HTTP methods each path supports.

Use `PrivateEndpoints` for connection operations and `PrivateLinks` for link
discovery. Registered ARM lifecycle, list, action, and legacy operations all
contribute paths, including registrations on custom resource models. Arbitrary
unregistered HTTP routes do not contribute.

Each exact parent path has its own requirement. Each missing path produces one
warning. The warning appears on an interface exposing an existing path, preferring
the connection point, then connection collection, then link collection.

## Impact

- **Area:** API, SDK

An incomplete API set prevents clients from discovering private link resources
or consistently listing and managing private endpoint connections.

## Incorrect

Assume `Widget`, `PrivateEndpointConnection`, and `PrivateLinkResource` are already
declared resource models. This resource exposes connection operations without
private link discovery.

```typespec
alias Connections = PrivateEndpoints<PrivateEndpointConnection>;
alias Links = PrivateLinks<PrivateLinkResource>;

@armResourceOperations
interface Widgets {
  read is Connections.Read<Widget>;
  list is Connections.ListByParent<Widget>;
}
```

## Correct

Add the matching private link collection for the same parent resource.

```typespec
alias Connections = PrivateEndpoints<PrivateEndpointConnection>;
alias Links = PrivateLinks<PrivateLinkResource>;

@armResourceOperations
interface Widgets {
  read is Connections.Read<Widget>;
  list is Connections.ListByParent<Widget>;
  links is Links.ListByParent<Widget>;
}
```

## Suppression

Prefer implementing the complete API set. Suppress a warning only for an
intentional exception approved by an ARM reviewer. Place
`#suppress "@azure-tools/typespec-azure-resource-manager/private-endpoint-apis-missing" "Reason approved by the ARM reviewer."`
on the interface named by the warning. A suppression does not add the missing API.

This rule is disabled in the Azure resource manager ruleset. Enable
`@azure-tools/typespec-azure-resource-manager/private-endpoint-apis-missing`
explicitly to check the API set.

## LintDiff Equivalent

This rule corresponds to
[ImplementPrivateEndpointAPIs](https://github.com/Azure/azure-openapi-validator/blob/main/docs/implement-private-endpoint-ap-is.md).
It checks registered ARM operations in the compiled program, rather than each
emitted document separately. It does not construct historical version projections.

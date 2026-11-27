Private endpoint connection GET and list responses and private link resource list responses must contain the properties needed by private link clients. Use the `PrivateEndpoints` and `PrivateLinks` templates with the standard ARM models to provide these properties.

If you customize a response, include `properties.privateEndpoint` and `properties.privateLinkServiceConnectionState` for private endpoint connections, or `properties.groupId`, `properties.requiredMembers`, and `properties.requiredZoneNames` for private link resources. List responses must contain a `value` array of these resources. The properties may be optional or inherited.

This rule checks 200 responses for these ARM resource GET operations. It does not require the APIs to exist.

## Impact

- **Area:** API, SDK

Missing properties prevent clients from consistently using private link resources.

The examples assume `Widget` is an ARM resource, `Connection` is declared as `PrivateEndpointConnectionResource`, and `Link` is declared as `PrivateLink`.

## ❌ Incorrect

### Private endpoint connection

This custom response omits the connection state.

```typespec
alias Connections = PrivateEndpoints<Connection>;

model IncompleteConnection {
  properties: {
    privateEndpoint?: Azure.ResourceManager.CommonTypes.PrivateEndpoint;
  };
}

@armResourceOperations
interface Widgets {
  getConnection is Connections.Read<Widget, Response = ArmResponse<IncompleteConnection>>;
}
```

### Private link resource

This custom list response omits the required zone names.

```typespec
alias Links = PrivateLinks<Link>;

model IncompleteLink {
  properties: {
    groupId?: string;
    requiredMembers?: string[];
  };
}

@armResourceOperations
interface Widgets {
  getLink is Links.Read<Widget>;
  listLinks is Links.ListByParent<
    Widget,
    Response = ArmResponse<ResourceListCustomResult<IncompleteLink>>
  >;
}
```

## ✅ Correct

### Private endpoint connection

Use the standard response from `PrivateEndpoints`.

```typespec
alias Connections = PrivateEndpoints<Connection>;

@armResourceOperations
interface Widgets {
  getConnection is Connections.Read<Widget>;
}
```

### Private link resource

Use the standard list response from `PrivateLinks`.

```typespec
alias Links = PrivateLinks<Link>;

@armResourceOperations
interface Widgets {
  getLink is Links.Read<Widget>;
  listLinks is Links.ListByParent<Widget>;
}
```

## LintDiff Equivalent

This rule corresponds to [PrivateEndpointResourceSchemaValidation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/private-endpoint-resource-schema-validation.md).

## Suppression

Suppress the rule on the operation only for an intentional compatibility exception approved by an ARM reviewer.

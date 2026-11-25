GET responses for private endpoint connections and private link resources must
contain the properties needed by private link clients.

For private endpoint connection responses, the resource must contain
`properties.privateEndpoint` and `properties.privateLinkServiceConnectionState`.
Private link resources must contain `properties.groupId`,
`properties.requiredMembers`, and `properties.requiredZoneNames`. Collection
responses must contain a `value` array of these resources. Properties may be
optional and may be inherited.

This rule checks GET 200 responses of resolved ARM resource operations with
paths ending in `/privateEndpointConnections`, `/privateEndpointConnections/{name}`,
or `/privateLinkResources`. It does not check whether these APIs exist or
require an ARM private link operation template.

## Impact

- **Area:** API, SDK

Missing properties prevent clients from consistently using private link resources.

## ❌ Incorrect

Assume `Widget` and `Connections` are declared for a private endpoint connection.
This overridden read response omits the connection state.

```typespec
model IncompleteConnection {
  properties: {
    privateEndpoint?: Azure.ResourceManager.CommonTypes.PrivateEndpoint;
  };
}

@armResourceOperations
interface Widgets {
  read is Connections.Read<Widget, Response = ArmResponse<IncompleteConnection>>;
}
```

## ✅ Correct

Include both connection properties in the response.

```typespec
model CompleteConnection {
  properties: {
    privateEndpoint?: Azure.ResourceManager.CommonTypes.PrivateEndpoint;
    privateLinkServiceConnectionState: Azure.ResourceManager.CommonTypes.PrivateLinkServiceConnectionState;
  };
}

@armResourceOperations
interface Widgets {
  read is Connections.Read<Widget, Response = ArmResponse<CompleteConnection>>;
}
```

## LintDiff Equivalent

This rule corresponds to
[PrivateEndpointResourceSchemaValidation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/private-endpoint-resource-schema-validation.md).
Unlike the Swagger rule, it only checks operations attached to resolved ARM
resources; unmatched list operations and unregistered paths are outside its scope.

## Suppression

Suppress the rule on the operation only for an intentional compatibility
exception approved by an ARM reviewer.

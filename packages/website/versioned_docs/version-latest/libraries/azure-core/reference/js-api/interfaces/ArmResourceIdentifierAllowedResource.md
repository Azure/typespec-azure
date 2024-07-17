---
jsApi: true
title: "[I] ArmResourceIdentifierAllowedResource"

---
## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| `scopes?` | `readonly` | [`ArmResourceDeploymentScope`](../type-aliases/ArmResourceDeploymentScope.md)[] | An array of scopes. If not specified, the default scope is ["ResourceGroup"]. See [Allowed Scopes](https://github.com/Azure/autorest/tree/main/docs/extensions#allowed-scopes). |
| `type` | `readonly` | `string` | The type of resource that is being referred to. For example Microsoft.Network/virtualNetworks or Microsoft.Network/virtualNetworks/subnets. See Example Types for more examples. |

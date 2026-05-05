---
title: arm-resource-required-operations
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/arm-resource-required-operations
```

ARM resources must declare the complete set of required lifecycle and list
operations defined by the [ARM RPC contract][rpc] (sections 2.2 and 2.3).

The required set depends on the resource kind:

| Resource kind        | Required operations                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Tracked              | `read`, `createOrUpdate`, `delete`, `list-by-parent` (satisfied by `list-by-resource-group`), `list-by-subscription` |
| Proxy / Extension    | `read`, `createOrUpdate`, `delete`, `list-by-parent`                                                                 |
| Singleton (any kind) | `read`, `createOrUpdate` only — no `delete`, no `list`                                                               |

For tracked resources, a `list-by-resource-group` operation satisfies the
`list-by-parent` requirement (the resource group is the parent in that scope).
For nested proxy or extension resources, `list-by-parent` refers to a list
operation under the parent resource's path.

When more than one operation is missing, a single diagnostic is emitted that
lists every missing operation. When only one is missing, a more specific
message ID is used so editors and tooling can present a clearer hint.

This rule is singleton-aware and supersedes
[`no-resource-delete-operation`](./no-resource-delete-operation.md). Both rules
are currently registered for backwards compatibility.

#### ❌ Incorrect — tracked resource missing the delete and list operations

```tsp
@armResourceOperations
interface EmployeeOperations {
  read is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
}
```

#### ✅ Correct — complete operation set for a tracked resource

```tsp
@armResourceOperations
interface EmployeeOperations {
  read is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  delete is ArmResourceDeleteWithoutOkAsync<Employee>;
  listByResourceGroup is ArmResourceListByParent<Employee>;
  listBySubscription is ArmListBySubscription<Employee>;
}
```

#### ✅ Correct — singleton resource (no delete or list required)

```tsp
@singleton
model Settings is ProxyResource<SettingsProperties> {
  @key
  @path
  @segment("settings")
  name: string;
}

@armResourceOperations
interface SettingsOperations {
  read is ArmResourceRead<Settings>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Settings>;
}
```

[rpc]: https://github.com/cloud-and-ai-microsoft/resource-provider-contract

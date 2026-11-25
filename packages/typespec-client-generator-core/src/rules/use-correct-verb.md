Use common SDK method names for resource lifecycle operations. Operation names should begin with `create` for PUT, `update` for PATCH,
and `delete` for DELETE. Prefix matching is case-insensitive. GET, POST, HEAD,
and other HTTP verbs are outside this rule.

This guidance applies to both ARM and data-plane services. To fix a warning,
rename the operation or use `@clientName` without a language scope, as shown below.
Changing only a language-specific name or an OpenAPI operation ID does not fix
the common SDK name.

The rule is disabled by default in the `client-sdk` ruleset.

These examples assume `Widget` and `WidgetProperties` are defined ARM resource types.

#### ❌ Incorrect

```typespec
@armResourceOperations
interface Widgets {
  replace is ArmResourceCreateOrReplaceAsync<Widget>;
  modify is ArmResourcePatchSync<Widget, Properties = WidgetProperties>;
  remove is ArmResourceDeleteSync<Widget>;
}
```

#### ✅ Correct

```typespec
@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  update is ArmResourcePatchSync<Widget, Properties = WidgetProperties>;
  delete is ArmResourceDeleteSync<Widget>;
}
```

## Impact

- **Area:** SDK

Renaming an already-shipped SDK method may introduce a breaking change.
Review compatibility before changing names. An unscoped `@clientName` changes
the common SDK name without renaming the TypeSpec operation:

```typespec
@armResourceOperations
interface Widgets {
  @clientName("deleteWidget")
  remove is ArmResourceDeleteSync<Widget>;
}
```

## Suppression

For new methods, fix the name or use an unscoped `@clientName`. When preserving
an already-shipped name requires an API-reviewer-approved exception, suppress
the warning on that operation with a justification:

```typespec
@armResourceOperations
interface Widgets {
  #suppress "@azure-tools/typespec-client-generator-core/use-correct-verb" "Preserve the already-shipped SDK method name."
  remove is ArmResourceDeleteSync<Widget>;
}
```

## Migration

If you use `use-create-for-put`, replace it with `use-correct-verb` in linter
configuration and suppressions. Enabling the replacement checks PATCH and DELETE
names as well as PUT names.

## LintDiff Equivalent

| Swagger validator                                                                                                    | Native SDK naming requirement     |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| [PutInOperationName](https://github.com/Azure/azure-openapi-validator/blob/main/docs/put-in-operation-name.md)       | PUT names start with `create`.    |
| [PatchInOperationName](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-in-operation-name.md)   | PATCH names start with `update`.  |
| [DeleteInOperationName](https://github.com/Azure/azure-openapi-validator/blob/main/docs/delete-in-operation-name.md) | DELETE names start with `delete`. |

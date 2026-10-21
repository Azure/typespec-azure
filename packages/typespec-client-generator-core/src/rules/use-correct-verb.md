Use common SDK method names for resource lifecycle operations. Operation names should  begin with `create` for PUT, `update` for PATCH,
and `delete` for DELETE. Prefix matching is case-insensitive. GET, POST, HEAD,
and other HTTP verbs are outside this rule.

The rule checks concrete HTTP service endpoints in ARM and data-plane services.
It does not require ARM provider metadata or check client-only declarations
outside services. It resolves common names through TCGC, honoring unscoped
`@clientName`, exact names, and the supported `@friendlyName` fallback.
Language-specific overrides and explicit OpenAPI operation IDs do not change
the common name. Diagnostics target the original operation.

The rule is disabled by default in the `client-sdk` ruleset. It does not select
an emitter or API-version projection, or reconstruct historical renamed names.

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

This rule replaces `use-create-for-put` and consolidates the proposed
`use-update-for-patch` and `use-delete-for-delete` rules. Replace the old name
in linter configuration and suppressions with `use-correct-verb`.
Enabling the replacement checks all three verbs, not just PUT.

## LintDiff Equivalent

| Swagger validator                                                                                                    | Native SDK naming requirement     |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| [PutInOperationName](https://github.com/Azure/azure-openapi-validator/blob/main/docs/put-in-operation-name.md)       | PUT names start with `create`.    |
| [PatchInOperationName](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-in-operation-name.md)   | PATCH names start with `update`.  |
| [DeleteInOperationName](https://github.com/Azure/azure-openapi-validator/blob/main/docs/delete-in-operation-name.md) | DELETE names start with `delete`. |

The native rule checks common SDK names rather than serialized `operationId`
or lintdiff authored names. It intentionally does not reproduce underscore,
group-prefix, or missing-ID exemptions. No emitted Swagger parity is claimed.

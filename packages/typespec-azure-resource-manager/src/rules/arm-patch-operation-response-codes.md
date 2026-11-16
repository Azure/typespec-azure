Synchronous ARM PATCH operations must return exactly `200` and `default`. Long-running PATCH operations must return exactly `200`, `202`, and `default`, and the `202` response must not have a body. The rule checks operations in ARM provider services, including nested namespaces.

An explicit `x-ms-long-running-operation` extension is considered long-running only when its value is the boolean `true`. Long-running options without that flag are invalid.

The legacy `@Azure.ClientGenerator.Core.Legacy.markAsLro` marker is honored when it applies to AutoRest. Prefer native polling metadata for new operations.

## Impact

- **Area:** API

Other response codes or a body on `202` violate the ARM PATCH contract and can cause clients to handle the operation incorrectly.

## ❌ Incorrect

Assume `Widget` is an ARM resource and these operations belong to its provider service.

### Synchronous update without a default response

```tsp
@patch
op update(): ArmResponse<Widget>;
```

### Long-running update without a 202 response

```tsp
@extension("x-ms-long-running-operation", true)
@patch
op update(): ArmResponse<Widget> | ErrorResponse;
```

## ✅ Correct

### Synchronous update

```tsp
@armResourceOperations
interface Widgets {
  update is ArmCustomPatchSync<Widget>;
}
```

### Long-running update

```tsp
@armResourceOperations
interface Widgets {
  update is ArmCustomPatchAsync<Widget>;
}
```

## Limitations

The rule inspects unprojected response types. If a response is added or removed in a particular API version, the unprojected result may not reflect every emitted version.

HTTP metadata resolution can repeat existing compiler diagnostics, as tracked in [#6084](https://github.com/Azure/typespec-azure/issues/6084).

The `no-response-body` rule can also warn about a `202` body when both rules are enabled.

## Suppression

Prefer the standard ARM PATCH templates or correct the custom response types. Suppression is appropriate only for a documented compatibility requirement of an existing API.

## LintDiff Equivalent

This rule covers [`PatchResponseCodes`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-response-codes.md) and [`LroPatch202`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/lro-patch202.md).

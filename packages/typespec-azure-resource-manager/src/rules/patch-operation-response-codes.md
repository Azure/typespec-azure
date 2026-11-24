Synchronous ARM PATCH operations must return exactly a `200` response and a standard error response. Long-running PATCH operations must return exactly `200`, `202`, and a standard error response, and the `202` response must not have a body. The rule checks operations in ARM provider services, including nested namespaces.

Like the ARM DELETE response-code rule, this rule identifies long-running operations using Azure Core LRO metadata. Prefer native polling metadata for new operations.

## Impact

- **Area:** API

Other response codes or a body on `202` violate the ARM PATCH contract and can cause clients to handle the operation incorrectly.

## ❌ Incorrect

Assume `Widget` is an ARM resource and these operations belong to its provider service.

### Synchronous update without a standard error response

```tsp
@patch
op update(): ArmResponse<Widget>;
```

### Long-running update without a 202 response

```tsp
model Status {
  @Azure.Core.lroStatus status: "Succeeded" | "Failed" | "Canceled" | "Running";
}

@patch
op update():
  | {
      @statusCode code: 200;

      @Azure.Core.pollingLocation
      @header("Operation-Location")
      location: ResourceLocation<Status>;

      @body value: Widget;
    }
  | ErrorResponse;
```

## ✅ Correct

Assume `Widget`, `WidgetPatch`, and their provider service are already declared.

### Synchronous update

```tsp
@armResourceOperations
interface Widgets {
  update is ArmCustomPatchSync<Widget, WidgetPatch>;
}
```

### Long-running update

```tsp
@armResourceOperations
interface Widgets {
  update is ArmCustomPatchAsync<Widget, WidgetPatch>;
}
```

## Limitations

The rule inspects unprojected response types. If a response is added or removed in a particular API version, the unprojected result may not reflect every emitted version.

An explicit `x-ms-long-running-operation` extension or legacy `@Azure.ClientGenerator.Core.Legacy.markAsLro` marker alone does not provide LRO metadata. AutoRest may emit a long-running flag for these operations while this rule treats them as synchronous. The rule does not validate `x-ms-long-running-operation-options`.

HTTP metadata resolution can repeat existing compiler diagnostics, as tracked in [#6084](https://github.com/Azure/typespec-azure/issues/6084).

The `no-response-body` rule can also warn about a `202` body when both rules are enabled.

## Suppression

Prefer the standard ARM PATCH templates or correct the custom response types. Suppression is appropriate only for a documented compatibility requirement of an existing API.

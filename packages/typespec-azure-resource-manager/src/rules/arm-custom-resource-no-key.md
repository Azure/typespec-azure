```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/arm-custom-resource-no-key
```

Without a key, operation paths may be duplicated.

## Impact

- **Area:** API, SDK

Mainly a correctness issue: the resource's name property should be marked with `@key`.

## ❌ Incorrect

```tsp
@Azure.ResourceManager.Legacy.customAzureResource
model CustomResource {
  someId: string;
}
```

## ✅ Correct

```tsp
@Azure.ResourceManager.Legacy.customAzureResource
model CustomResource {
  @key
  someId: string;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise add `@key` to the name parameter of the resource.

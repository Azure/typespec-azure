The `@dynamicModel` decorator currently describes behavior supported by the C# emitter. Specify the `"csharp"` scope so other opted-in emitters do not mistake the metadata for behavior they do not implement.

#### ❌ Incorrect

```tsp
@dynamicModel
model Pet {}

@dynamicModel(#{ scope: "python" })
namespace PetStore {

}
```

#### ✅ Correct

```tsp
@dynamicModel("csharp")
model Pet {}

@dynamicModel(#{ scope: "csharp" })
namespace PetStore {

}
```

## Impact

- **Area:** SDK

Without an explicit C# scope, the dynamic-model marker may be consumed by emitters that do not generate C#'s JSON Patch-backed model API.

## Suppression

Suppression is not recommended. Add the `"csharp"` scope to make the current emitter support explicit. If the marker is intentionally being prepared for a future non-C# emitter, suppress this rule with a justification until that emitter supports dynamic models.

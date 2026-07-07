---
title: "single-word-model-name"
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/single-word-model-name
```

Model names should be multi-word to avoid naming collisions with .NET platform or third-party types. The codefix can suggest C# names and write `@@clientName` to `client.tsp`.

#### ❌ Incorrect

```tsp
model Document {
  id: string;
}
```

#### ✅ Correct

```tsp
model TableDocument {
  id: string;
}
```

```tsp
@clientName("StorageDocument", "csharp")
model Document {
  id: string;
}
```

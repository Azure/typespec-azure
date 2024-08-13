---
title: "no-multiple-discriminator"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-multiple-discriminator
```

Using a nested polymophic relationship is now allowed in Azure services. Most JSON serializer and deserializer do not support this feature.

#### ❌ Incorrect

```tsp
@discriminator("fishtype")
model Fish {
  fishtype: string;
}

@discriminator("sharktype")
model Shark extends Fish {
  fishtype: "shark";
  sharktype: string;
}

model WhiteShark extends Shark {
  sharktype: "white";
}
```

#### ✅ Correct

```tsp
@discriminator("fishtype")
model Fish {
  fishtype: string;
}

model Shark extends Fish {
  fishtype: "shark";
}

model WhiteShark extends Fish {
  fishtype: "white-shark";
}
```

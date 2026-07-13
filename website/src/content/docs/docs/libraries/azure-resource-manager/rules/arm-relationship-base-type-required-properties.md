---
title: arm-relationship-base-type-required-properties
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-relationship-base-type-required-properties
```

Resources decorated with `@azureBaseType` for the Relationship base type must be extension resources with the required Relationship schema.

#### ❌ Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model MyRelationshipProperties {
  sourceId: string;
  metadata: RelationshipMetadata;
}

@azureBaseType(#{ baseType: "Relationship", version: "2024-06-01" })
model MyRelationship is ExtensionResource<MyRelationshipProperties> {
  ...ResourceNameParameter<MyRelationship>;
}
```

#### ✅ Correct

```tsp
using Azure.ResourceManager.BaseTypes.Relationships;

@armProviderNamespace
namespace Microsoft.Contoso;

model MyRelationshipProperties is RelationshipProperties;

model MyRelationship is Relationship<MyRelationshipProperties> {
  ...ResourceNameParameter<MyRelationship>;
}
```

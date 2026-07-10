---
title: arm-relationship-base-type-required-properties
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-relationship-base-type-required-properties
```

Resources decorated with `@azureBaseType` for the Relationship base type must be extension resources and include `sourceId`, `targetId`, `targetTenant`, `metadata`, and `provisioningState` properties.

#### ❌ Incorrect

```tsp
using Azure.ResourceManager.BaseTypes;

@armProviderNamespace
namespace Microsoft.Contoso;

model Metadata {
  sourceType: string;
}

model MyRelationshipProperties {
  @visibility(Lifecycle.Read)
  baseTypes: BaseTypeInfo[];

  sourceId: string;
  targetId: string;
  targetTenant: string;
  metadata: Metadata;
  // Missing metadata.targetType and provisioningState
}

@azureBaseType(#{ baseType: "Relationship", version: "2024-06-01" })
model MyRelationship is TrackedResource<MyRelationshipProperties> {
  ...ResourceNameParameter<MyRelationship>;
}
```

#### ✅ Correct

```tsp
using Azure.ResourceManager.BaseTypes.Relationships;

@armProviderNamespace
namespace Microsoft.Contoso;

model MyRelationshipProperties is RelationshipProperties {
  /** RP-specific relationship data. */
  description?: string;
}

model MyRelationship is Relationship<MyRelationshipProperties> {
  ...ResourceNameParameter<
    Resource = MyRelationship,
    KeyName = "relationshipName",
    SegmentName = "dependencyOf"
  >;
}
```

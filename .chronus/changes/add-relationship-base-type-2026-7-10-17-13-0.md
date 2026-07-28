---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add the experimental Relationship base type for Azure Resource Manager extension resources. `RelationshipProperties` provides the `baseTypes` descriptor, source and target resource and tenant identifiers, and provisioning state. Resource providers can extend this property bag with relationship-specific information and expose the relationship against any ARM resource scope.

Example of creating a dependency relationship with RP-specific metadata and operations:

```typespec
using Azure.ResourceManager;
using Azure.ResourceManager.BaseTypes.Relationships;

model DependencyOfMetadata {
  sourceType: string;
  targetType: string;
  description?: string;
}

model DependencyOfProperties is RelationshipProperties {
  metadata: DependencyOfMetadata;
}

#suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "Experimental BaseTypes"
model DependencyOf is Relationship<DependencyOfProperties> {
  ...ResourceNameParameter<
    Resource = DependencyOf,
    KeyName = "relationshipName",
    SegmentName = "dependencyOf",
    NamePattern = "^[a-zA-Z0-9_.-]{1,64}$"
  >;
}

interface DependencyOfOps<Scope extends Azure.ResourceManager.Foundations.SimpleResource> {
  get is Extension.Read<Scope, DependencyOf>;
  create is Extension.CreateOrReplaceAsync<Scope, DependencyOf>;
  update is Extension.CustomPatchAsync<
    Scope,
    DependencyOf,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<DependencyOf, DependencyOfProperties>
  >;
  delete is Extension.DeleteWithoutOkAsync<Scope, DependencyOf>;
  list is Extension.ListByTarget<Scope, DependencyOf>;
}
```

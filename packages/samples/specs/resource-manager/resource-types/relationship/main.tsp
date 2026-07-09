import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Http;
using Rest;
using Versioning;
using Azure.Core;
using Azure.ResourceManager;
using Azure.ResourceManager.BaseTypes.Relationships;

/** Contoso Relationship Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoRelationshipsClient" })
@versioned(Versions)
namespace Microsoft.ContosoRelationships;

/** Contoso Relationships API versions. */
enum Versions {
  /** 2024-06-01 version. */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  `2024-06-01`,
}

/** Properties for a Contoso dependency relationship. */
model DependencyRelationshipProperties is RelationshipProperties {
  /** RP-specific confidence score for the relationship. */
  @visibility(Lifecycle.Read)
  confidenceScore?: float64;

  /** Optional RP-specific description of the dependency. */
  description?: string;
}

/** A Contoso dependency relationship anchored at the source scope. */
#suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "Experimental BaseTypes"
model DependencyRelationship is Relationship<DependencyRelationshipProperties> {
  ...ResourceNameParameter<
    Resource = DependencyRelationship,
    KeyName = "relationshipName",
    SegmentName = "dependencyOf"
  >;
}

interface Operations extends Azure.ResourceManager.Operations {}

/** Defines dependency relationship operations for a given source scope. */
interface DependencyRelationshipOps<Scope extends Azure.ResourceManager.Foundations.SimpleResource> {
  get is Extension.Read<Scope, DependencyRelationship>;
  createOrUpdate is Extension.CreateOrReplaceAsync<Scope, DependencyRelationship>;
  update is Extension.CustomPatchSync<
    Scope,
    DependencyRelationship,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<
      DependencyRelationship,
      DependencyRelationshipProperties
    >
  >;
  delete is Extension.DeleteWithoutOkAsync<Scope, DependencyRelationship>;
  listBySource is Extension.ListByTarget<Scope, DependencyRelationship>;
}

/**
 * Relationship operations over any source scope.
 *
 * Routes are anchored at:
 * `{scope}/providers/Microsoft.ContosoRelationships/dependencyOf/{relationshipName}`.
 */
@armResourceOperations
interface DependencyRelationships extends DependencyRelationshipOps<Extension.ScopeParameter> {}

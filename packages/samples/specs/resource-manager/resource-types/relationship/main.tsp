import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Http;
using Rest;
using Versioning;
using Azure.ResourceManager;
using Azure.ResourceManager.BaseTypes.Relationships;

/** Contoso Relationships Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoRelationshipsClient" })
@versioned(Versions)
namespace Microsoft.ContosoRelationships;

/** Contoso Relationships API versions */
enum Versions {
  /** 2024-06-01 version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  `2024-06-01`,
}

interface Operations extends Azure.ResourceManager.Operations {}

/** Metadata for a Contoso dependency relationship. */
model DependencyOfMetadata is RelationshipMetadata {
  /** A human-readable relationship description. */
  description?: string;
}

/** Provisioning state values for a Contoso dependency relationship async flow. */
@Azure.Core.lroStatus
union DependencyOfProvisioningState {
  /** Include standard terminal provisioning states. */
  ResourceProvisioningState,

  /** The dependency relationship creation has been accepted. */
  Accepted: "Accepted",

  /** The dependency relationship is being provisioned. */
  Provisioning: "Provisioning",

  /** The dependency relationship is being deleted. */
  Deleting: "Deleting",

  string,
}

/** Provisioning state property for a Contoso dependency relationship. */
model DependencyOfProvisioningStateProperty {
  /** The provisioning state of the dependency relationship. */
  @visibility(Lifecycle.Read)
  provisioningState?: DependencyOfProvisioningState;
}

/** Properties for a Contoso dependency relationship. */
model DependencyOfProperties is RelationshipProperties<
  Metadata = DependencyOfMetadata,
  ProvisioningStateProperty = DependencyOfProvisioningStateProperty
>;

/**
 * A dependency relationship between a source scope and target entity.
 */
#suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "Experimental BaseTypes"
model DependencyOf is Relationship<DependencyOfProperties> {
  /** The relationship name. */
  @key("relationshipName")
  @path
  @segment("dependencyOf")
  @pattern("^[a-zA-Z0-9_.-]{1,64}$")
  @visibility(Lifecycle.Read)
  name: string;
}

/** Defines dependency relationship operations for a source scope. */
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

/**
 * Operations over any source scope.
 * Routes at: {scope}/providers/Microsoft.ContosoRelationships/dependencyOf/{relationshipName}
 */
@armResourceOperations
interface DependencyOfRelationships extends DependencyOfOps<Extension.ScopeParameter> {}

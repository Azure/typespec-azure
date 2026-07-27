import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2024_01_01: "2024-01-01",
}

interface Operations extends Azure.ResourceManager.Operations {}

/** A level-1 resource. */
model Level1 is TrackedResource<Level1Properties> {
  @key("level1Name")
  @segment("level1s")
  @doc("Name")
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @path
  name: string;
}

/** Level1 properties. */
model Level1Properties {
  /** Description. */
  description?: string;

  /** The provisioning state. */
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

/** The provisioning state of a resource. */
union ProvisioningState {
  string,
  ResourceProvisioningState,
}

@armResourceOperations
interface Level1s {
  get is ArmResourceRead<Level1>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Level1>;
  update is ArmResourcePatchAsync<Level1, Level1Properties>;
  delete is ArmResourceDeleteWithoutOkAsync<Level1>;
  listByResourceGroup is ArmResourceListByParent<Level1>;
  listBySubscription is ArmListBySubscription<Level1>;
}

/** A level-2 resource. */
@parentResource(Level1)
model Level2 is TrackedResource<Level2Properties> {
  @key("level2Name")
  @segment("level2s")
  @doc("Name")
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @path
  name: string;
}

/** Level2 properties. */
model Level2Properties {
  /** Description. */
  description?: string;

  /** The provisioning state. */
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@armResourceOperations
interface Level2s {
  get is ArmResourceRead<Level2>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Level2>;
  update is ArmResourcePatchAsync<Level2, Level2Properties>;
  delete is ArmResourceDeleteWithoutOkAsync<Level2>;
  listByParent is ArmResourceListByParent<Level2>;
}

/** A level-3 resource. */
@parentResource(Level2)
model Level3 is TrackedResource<Level3Properties> {
  @key("level3Name")
  @segment("level3s")
  @doc("Name")
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @path
  name: string;
}

/** Level3 properties. */
model Level3Properties {
  /** Description. */
  description?: string;

  /** The provisioning state. */
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@armResourceOperations
interface Level3s {
  get is ArmResourceRead<Level3>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Level3>;
  update is ArmResourcePatchAsync<Level3, Level3Properties>;
  delete is ArmResourceDeleteWithoutOkAsync<Level3>;
  listByParent is ArmResourceListByParent<Level3>;
}

/** A level-4 resource (violates third-level nesting limit). */
@parentResource(Level3)
model Level4 is TrackedResource<Level4Properties> {
  @key("level4Name")
  @segment("level4s")
  @doc("Name")
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @path
  name: string;
}

/** Level4 properties. */
model Level4Properties {
  /** Description. */
  description?: string;

  /** The provisioning state. */
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@armResourceOperations
interface Level4s {
  get is ArmResourceRead<Level4>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Level4>;
  update is ArmResourcePatchAsync<Level4, Level4Properties>;
  delete is ArmResourceDeleteWithoutOkAsync<Level4>;
  listByParent is ArmResourceListByParent<Level4>;
}

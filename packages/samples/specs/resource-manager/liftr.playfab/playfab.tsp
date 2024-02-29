import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Versioning;
using TypeSpec.Rest;
using Azure.ResourceManager;

@armProviderNamespace
@service({
  title: "Azure PlayFab",
})
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.PlayFab;

interface Operations extends Azure.ResourceManager.Operations {}

@doc("A reference to a resource of type title.")
@pattern("\\/subscriptions\\/[a-z0-9\\-]+\\/resourceGroups\\/[^\\/]+\\/providers\\/Microsoft\\.PlayFab\\/titles\\/[^\\/]+")
scalar TitleReference
  extends ResourceIdentifier<[
    {
      type: "Microsoft.Playfab/titles",
    }
  ]>;

@doc("A reference to a player database resource.")
@pattern("\\/subscriptions\\/[a-z0-9\\-]+\\/resourceGroups\\/[^\\/]+\\/providers\\/Microsoft\\.PlayFab\\/playerDatabases\\/[^\\/]+")
scalar PlayerDatabaseReference
  extends ResourceIdentifier<[
    {
      type: "Microsoft.Playfab/playerDatabases",
    }
  ]>;

@doc("Details of the player database.")
model PlayerDatabase is TrackedResource<PlayerDatabaseProperties> {
  @doc("The name of the player database resource.")
  @key
  @segment("playerDatabases")
  @path
  name: string;
}

@armResourceOperations
interface PlayerDatabases
  extends TrackedResourceOperations<PlayerDatabase, PlayerDatabaseProperties> {}

@doc("Details of a title.")
model Title is TrackedResource<TitleProperties> {
  @doc("Name of the title resource.")
  @key
  @segment("titles")
  @path
  name: string;
}

@armResourceOperations
interface Titles extends TrackedResourceOperations<Title, TitleProperties> {}

@doc("The properties of a player database.")
model PlayerDatabaseProperties {
  @doc("The user id for this player database")
  userId: string;

  @doc("The set of titles belonging to this player database.")
  titles?: TitleReference[];

  ...DefaultProvisioningStateProperty;
}

@doc("The properties of a title.")
model TitleProperties {
  @doc("The player database for this title")
  @visibility("create", "read")
  parentDatabase: PlayerDatabaseReference;

  ...DefaultProvisioningStateProperty;
}

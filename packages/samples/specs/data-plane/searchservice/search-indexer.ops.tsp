import "@typespec/http";
import "@typespec/rest";

import "./searchservice.models.tsp";

// TODO: Parameterized host. ISSUE: https://github.com/microsoft/typespec/issues/175
@doc("Client that can be used to manage and query indexes and documents, as well as manage other resources, on a search service.")
@useAuth(
  ApiKeyAuth<ApiKeyLocation.header, "api-key"> | OAuth2Auth<[
    {
      type: OAuth2FlowType.implicit,
      authorizationUrl: "https://login.contoso.com/common/oauth2/v2.0/authorize",
      scopes: ["https://cognitiveservices.azure.com/.default"],
    }
  ]>
)
@service({
  title: "Search Service",
  version: "2021-04-30-Preview",
})
namespace Azure.SearchService;

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Rest.Resource;
using TypeSpec.OpenAPI;

@tag("Indexers")
interface IndexersApis {
  @route("/indexers")
  @doc("Lists all indexers available for a search service.")
  @get
  list(...SelectParameter, ...ClientRequestIdParameter, ...ApiVersionParameter): CollectionResult<
    SearchIndexer,
    "Indexers"
  > | SearchError;

  @route("/indexers")
  @doc("Creates a new search indexer.")
  @post
  create(
    @doc("The definition of the data source to create.")
    @body
    body: SearchIndexer,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): SearchCreatedResponse<SearchIndexer> | SearchError;

  @doc("Retrieves an indexer definition.")
  @route("/indexers('{indexerName}')")
  @get
  get(
    @doc("The name of the data source to retrieve.")
    @path
    indexerName: string,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): SearchIndexer | SearchError;

  @doc("Creates a new indexer or updates an indexer if it already exists.")
  @route("/indexers('{indexerName}')")
  @put
  createOrUpdate(
    @doc("The name of the indexer to create or update.")
    @path
    indexerName: string,

    @doc("The definition of the data source to create or update.")
    @body
    body: SearchIndexer,

    ...IgnoreResetRequirementsParameter,
    ...DisableCacheReprocessingChangeDetectionParameter,
    ...ClientRequestIdParameter,
    ...IfMatchParameter,
    ...IfNoneMatchParameter,
    ...PreferHeaderParameter,
    ...ApiVersionParameter,
  ): SearchIndexer | SearchCreatedResponse<SearchIndexer> | SearchError;

  @doc("Deletes a indexer.")
  @route("/indexers('{indexerName}')")
  @delete
  delete(
    @doc("The name of the indexer to delete.")
    @path
    indexerName: string,

    ...ClientRequestIdParameter,
    ...IfMatchParameter,
    ...IfNoneMatchParameter,
    ...ApiVersionParameter,
  ): NoContentResponse | NotFoundResponse | SearchError;

  @doc("Resets the change tracking state associated with an indexer.")
  @route("/indexers('{indexerName}')/search.reset")
  @post
  reset(
    @doc("The name of the indexer to reset.")
    @path
    indexerName: string,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): NoContentResponse | SearchError;

  @doc("Resets specific documents in the datasource to be selectively re-ingested by the indexer.")
  @route("/indexers('{indexerName}')/search.resetdocs")
  @post
  resetDocs(
    @doc("The name of the indexer to reset.")
    @path
    indexerName: string,

    @doc("datasource document identifiers to be reset")
    @body
    @projectedName("json", "keysOrIds")
    documentKeysOrIds: string[],

    @doc("If false, keys or ids will be appended to existing ones. If true, only the keys or ids in this payload will be queued to be re-ingested.")
    @query
    overwrite?: boolean = false,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): NoContentResponse | SearchError;

  @doc("Runs an indexer on-demand.")
  @route("/indexers('{indexerName}')/search.run")
  @post
  run(
    @doc("The name of the indexer to reset.")
    @path
    indexerName: string,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): AcceptedResponse | SearchError;

  @doc("Returns the current status and execution history of an indexer.")
  @route("/indexers('{indexerName}')/search.status")
  @get
  getStatus(
    @doc("The name of the indexer for which to retrieve status.")
    @path
    indexerName: string,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): SearchIndexerStatus | SearchError;
}

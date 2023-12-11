import "./search-index.models.tsp";
import "@typespec/http";
import "@typespec/rest";
import "./common.tsp";

using TypeSpec.Http;

namespace Azure.SearchService;

@tag("Indexes")
interface Indexes {
  @route("/indexes")
  @doc("Lists all indexes available for a search service.")
  @get
  list(...SelectParameter, ...ClientRequestIdParameter, ...ApiVersionParameter): CollectionResult<
    SearchIndex,
    "Indexes"
  > | SearchError;

  @route("/indexes")
  @doc("Creates a new search index.")
  @post
  create(
    @doc("The definition of the index to create.")
    @body
    body: SearchIndex,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): SearchCreatedResponse<SearchIndex> | SearchError;

  @doc("Retrieves an index definition.")
  @route("/indexes('{indexName}')")
  @get
  get(
    @doc("The name of the index to retrieve.")
    @path
    indexName: string,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): SearchIndex | SearchError;

  @doc("Creates a new search index or updates an index if it already exists.")
  @route("/indexes('{indexName}')")
  @put
  createOrUpdate(
    @doc("The name of the index to create or update.")
    @path
    indexName: string,

    @doc("The definition of the index to create or update.")
    @body
    body: SearchIndex,

    @doc("Allows new analyzers, tokenizers, token filters, or char filters to be added to an index by taking the index offline for at least a few seconds. This temporarily causes indexing and query requests to fail. Performance and write availability of the index can be impaired for several minutes after the index is updated, or longer for very large indexes.")
    @query
    allowIndexDowntime?: boolean,

    ...ClientRequestIdParameter,
    ...IfMatchParameter,
    ...IfNoneMatchParameter,
    ...PreferHeaderParameter,
    ...ApiVersionParameter,
  ): SearchIndex | SearchCreatedResponse<SearchIndex> | SearchError;

  @doc("Deletes a search index and all the documents it contains. This operation is permanent, with no recovery option. Make sure you have a master copy of your index definition, data ingestion code, and a backup of the primary data source in case you need to re-build the index.")
  @route("/indexes('{indexName}')")
  @delete
  delete(
    @doc("The name of the index to delete.")
    @path
    indexName: string,

    ...ClientRequestIdParameter,
    ...IfMatchParameter,
    ...IfNoneMatchParameter,
    ...ApiVersionParameter,
  ): NoContentResponse | SearchError;

  @doc("Returns statistics for the given index, including a document count and storage usage.")
  @route("/indexes('{indexName}')/search.stats")
  @get
  getStatistics(
    @doc("The name of the index for which to retrieve statistics.")
    @path
    indexName: string,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): GetIndexStatisticsResult | SearchError;

  @doc("Shows how an analyzer breaks text into tokens.")
  @route("/indexes('{indexName}')/search.analyze")
  @post
  analyze(
    @doc("The name of the index for which to test an analyzer.")
    @path
    indexName: string,

    @doc("The text and analyzer or analysis components to test.")
    @body
    request: AnalyzeRequest,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): AnalyzeResult | SearchError;
}

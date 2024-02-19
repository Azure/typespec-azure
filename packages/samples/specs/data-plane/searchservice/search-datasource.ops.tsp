import "@typespec/http";
import "@typespec/rest";

import "./searchservice.models.tsp";

namespace Azure.SearchService;

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Rest.Resource;

@tag("DataSources")
interface DatasourcesApis {
  @route("/datasources")
  @doc("Lists all indexes data sources available for a search service.")
  @get
  list(...SelectParameter, ...ClientRequestIdParameter, ...ApiVersionParameter): CollectionResult<
    SearchIndexerDataSource,
    "DataSources"
  > | SearchError;

  @route("/datasources")
  @doc("Creates a new datasource.")
  @post
  create(
    @doc("The definition of the data source to create.")
    @body
    body: SearchIndexerDataSource,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): SearchCreatedResponse<SearchIndexerDataSource> | SearchError;

  @doc("Retrieves an index definition.")
  @route("/datasources('{dataSourceName}')")
  @get
  get(
    @doc("The name of the data source to retrieve.")
    @path
    dataSourceName: string,

    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): SearchIndexerDataSource | SearchError;

  @doc("Creates a new search data source or updates an data source if it already exists.")
  @route("/datasources('{dataSourceName}')")
  @put
  createOrUpdate(
    @doc("The name of the data source to create or update.")
    @path
    dataSourceName: string,

    @doc("The definition of the data source to create or update.")
    @body
    body: SearchIndexerDataSource,

    ...IgnoreResetRequirementsParameter,
    ...ClientRequestIdParameter,
    ...IfMatchParameter,
    ...IfNoneMatchParameter,
    ...PreferHeaderParameter,
    ...ApiVersionParameter,
  ): SearchIndexerDataSource | SearchCreatedResponse<SearchIndexerDataSource> | SearchError;

  @doc("Deletes a datasource.")
  @route("/datasources('{dataSourceName}')")
  @delete
  delete(
    @doc("The name of the data source to delete.")
    @path
    dataSourceName: string,

    ...ClientRequestIdParameter,
    ...IfMatchParameter,
    ...IfNoneMatchParameter,
    ...ApiVersionParameter,
  ): NoContentResponse | NotFoundResponse | SearchError;
}

@tag("Service")
interface ServiceApis {
  @get
  @route("servicestats")
  GetServiceStatistics(
    ...ClientRequestIdParameter,
    ...ApiVersionParameter,
  ): ServiceStatistics | SearchError;
}

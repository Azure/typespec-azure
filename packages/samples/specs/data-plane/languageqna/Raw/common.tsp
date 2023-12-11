import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

// namespace Azure.QnAMaker.Common;

@doc("The set of possible error codes.")
enum ErrorCode {
  @doc("Invalid request")
  InvalidRequest,

  @doc("Invalid argument")
  InvalidArgument,

  @doc("Unauthorized")
  Unauthorized,

  @doc("Forbidden")
  Forbidden,

  @doc("Not found")
  NotFound,

  @doc("Project not found")
  ProjectNotFound,

  @doc("Operation not found")
  OperationNotFound,

  @doc("Azure Cognitive Search not found")
  AzureCognitiveSearchNotFound,

  @doc("Azure Cognitive Search index not found")
  AzureCognitiveSearchIndexNotFound,

  @doc("Too many requests")
  TooManyRequests,

  @doc("Azure Cognitive Search throttling")
  AzureCognitiveSearchThrottling,

  @doc("Azure Cognitive Search index limit reached")
  AzureCognitiveSearchIndexLimitReached,

  @doc("Internal server error")
  InternalServerError,

  @doc("Service unavailable")
  ServiceUnavailable,
}

@doc("The projectName parameter definition.")
model ProjectNamePathParameter {
  @path
  @doc("The name of the project")
  @maxLength(100)
  projectName: string;
}

@doc("The jobId parameter definition.")
model JobIdParameter {
  @extension("x-ms-parameter-location", "method")
  @doc("Job ID")
  @path
  jobId: string;
}

@doc("The format parameter definition.")
model ImportExportFormatParameter {
  @doc("Knowledge base Import or Export format")
  @query
  format?: ImportExportFormat;
}

@doc("The assetKind parameter definition.")
model AssetKindParameter {
  @doc("Kind of the asset of the project")
  @query
  assetKind?: "qnas" | "synonyms";
}

@doc("The language property definition.")
model Language {
  @projectedName("csharp", "LanguageCode")
  @doc("Language of the text records. This is BCP-47 representation of a language. For example, use \"en\" for English; \"es\" for Spanish etc. If not set, use \"en\" for English as default.")
  language?: string;
}

@doc("The format of an import or export operation.")
enum ImportExportFormat {
  @doc("Export or Import QnA assets in JSON format")
  json,

  @doc("Export or Import knowledge base replica including all assets and metadata in Excel format.")
  tsv,

  @doc("Export or Import knowledge base replica including all assets and metadata in Tsv format.")
  excel,
}

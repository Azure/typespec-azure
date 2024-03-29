import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

// namespace Azure.QnAMaker.Common;

@doc("The set of possible error codes.")
union ErrorCode {
  string,

  @doc("Invalid request")
  InvalidRequest: "InvalidRequest",

  @doc("Invalid argument")
  InvalidArgument: "InvalidArgument",

  @doc("Unauthorized")
  Unauthorized: "Unauthorized",

  @doc("Forbidden")
  Forbidden: "Forbidden",

  @doc("Not found")
  NotFound: "NotFound",

  @doc("Project not found")
  ProjectNotFound: "ProjectNotFound",

  @doc("Operation not found")
  OperationNotFound: "OperationNotFound",

  @doc("Azure Cognitive Search not found")
  AzureCognitiveSearchNotFound: "AzureCognitiveSearchNotFound",

  @doc("Azure Cognitive Search index not found")
  AzureCognitiveSearchIndexNotFound: "AzureCognitiveSearchIndexNotFound",

  @doc("Too many requests")
  TooManyRequests: "TooManyRequests",

  @doc("Azure Cognitive Search throttling")
  AzureCognitiveSearchThrottling: "AzureCognitiveSearchThrottling",

  @doc("Azure Cognitive Search index limit reached")
  AzureCognitiveSearchIndexLimitReached: "AzureCognitiveSearchIndexLimitReached",

  @doc("Internal server error")
  InternalServerError: "InternalServerError",

  @doc("Service unavailable")
  ServiceUnavailable: "ServiceUnavailable",
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
  @doc("Language of the text records. This is BCP-47 representation of a language. For example, use \"en\" for English; \"es\" for Spanish etc. If not set, use \"en\" for English as default.")
  language?: string;
}

@doc("The format of an import or export operation.")
union ImportExportFormat {
  string,

  @doc("Export or Import QnA assets in JSON format")
  json: "json",

  @doc("Export or Import knowledge base replica including all assets and metadata in Excel format.")
  tsv: "tsv",

  @doc("Export or Import knowledge base replica including all assets and metadata in Tsv format.")
  excel: "excel",
}

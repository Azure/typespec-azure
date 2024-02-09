import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";

// cspell:ignore qnas

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@doc("Language of the text records. This is BCP-47 representation of a language. For example, use \"en\" for English; \"es\" for Spanish etc. If not set, use \"en\" for English as default.")
scalar Language extends string;

@error
model ODataError {
  message: string;
}

@doc("Error response")
@error
model ErrorResponse {
  @doc("The error object")
  error: Error;
}

@doc("The error object")
model Error {
  @doc("One of a server-defined set of error codes")
  code: ErrorCode;

  @doc("A human-readable representation of the error")
  message: string;

  @doc("Error target")
  target?: string;
}

@doc("Collection of error types")
model Errors {
  errors: Error[];
}

enum ErrorCode {
  InvalidRequest,
  InvalidArgument,
  Unauthorized,
  Forbidden,
  NotFound,
  ProjectNotFound,
  OperationNotFound,
  AzureCognitiveSearchNotFound,
  AzureCognitiveSearchIndexNotFound,
  TooManyRequests,
  AzureCognitiveSearchThrottling,
  AzureCognitiveSearchIndexLimitReached,
  InternalServerError,
  ServiceUnavailable,
}

model ApiVersionParameter {
  @doc("Client API version")
  @query("api-version")
  apiVersion: string;
}

model ProjectNamePathParameter {
  @extension("x-ms-parameter-location", "method")
  @doc("The name of the project to use")
  @maxLength(100)
  @path
  projectName: string;
}

model JobIdParameter {
  @extension("x-ms-parameter-location", "method")
  @doc("Job ID")
  @path
  jobId: string;
}

model TopParameter {
  @extension("x-ms-parameter-location", "method")
  @doc("The maximum number of resources to return from the collection")
  @query
  top?: int32;
}

model SkipParameter {
  @extension("x-ms-parameter-location", "method")
  @doc("An offset into the collection of the first resource to be returned")
  @query
  skip?: int32;
}

model MaxPageSizeParameter {
  @extension("x-ms-parameter-location", "method")
  @doc("The maximum number of resources to include in a single response")
  @query
  maxpagesize?: int32;
}

alias ListParameters = TopParameter & SkipParameter & MaxPageSizeParameter;

model ImportExportFormatParameter {
  @extension("x-ms-parameter-location", "method")
  @doc("Knowledge base Import or Export format")
  @query
  format?: ImportExportFormat;
}

model AssetKindParameter {
  @extension("x-ms-parameter-location", "method")
  @doc("Kind of the asset of the project")
  @query
  assetKind?: "qnas" | "synonyms";
}

alias LROResponse = (AcceptedResponse & {
  @header("Operation-Location") operationLocation: string;
}) | ErrorResponse;

// Common models

enum ImportExportFormat {
  @doc("Export or Import QnA assets in JSON format")
  json,

  @doc("Export or Import knowledge base replica including all assets and metadata in Excel format.")
  tsv,

  @doc("Export or Import knowledge base replica including all assets and metadata in Tsv format.")
  excel,
}

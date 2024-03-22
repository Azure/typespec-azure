import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace Azure.SearchService;

@doc("The error object")
@error
model SearchError {
  @doc("One of a server-defined set of error codes")
  @visibility("read")
  code: string;

  @doc("A human-readable representation of the error")
  @visibility("read")
  message: string;

  @doc("An array of details about specific errors that led to this reported error.")
  @visibility("read")
  details?: SearchError[];
}

model ApiVersionParameter {
  #suppress "@azure-tools/typespec-azure-core/casing-style" "This is the name of a query parameter."
  @doc("Client API version")
  @TypeSpec.Http.query
  `api-version`: string;
}

// ISSUE: Can't set x-ms-parameter-grouping: https://github.com/Azure/typespec-azure/issues/1000
// ISSUE: @extension on parameter doesn't work: https://github.com/Azure/typespec-azure/issues/1121
model ClientRequestIdParameter {
  #suppress "@azure-tools/typespec-azure-core/casing-style" "This is the name of an HTTP header."
  @doc("The tracking ID sent with the request to help with debugging.")
  @TypeSpec.Http.header
  `x-ms-client-request-id`: string;
}

model PreferHeaderParameter {
  @doc("The tracking ID sent with the request to help with debugging.")
  @TypeSpec.Http.header("Prefer")
  prefer: "return=representation"; // BUGBUG. format needed, also missing few other custom x-ms flags
}

model IfMatchParameter {
  @doc("The tracking ID sent with the request to help with debugging.")
  @TypeSpec.Http.header("If-Match")
  ifMatch?: string; // BUGBUG. format needed, also missing few other custom x-ms flags
}

model IfNoneMatchParameter {
  @doc("Defines the If-None-Match condition. The operation will be performed only if the ETag on the server does not match this value.")
  @TypeSpec.Http.header("If-None-Match")
  ifNoneMatch?: string;
}

model SelectParameter {
  @doc("Selects which top-level properties of the resource to retrieve. Specified as a comma-separated list of JSON property names, or '*' for all properties. The default is all properties.")
  @TypeSpec.Http.query
  $select?: string;
}

model CollectionResult<Value, Name> {
  @extension("x-ms-client-name", Name)
  value: Value;
}

model SearchCreatedResponse<ResponseBody> {
  ...CreatedResponse;
  @body body: ResponseBody;
}

model ETag {
  @encodedName("application/json", "@odata.etag")
  @doc("The ETag of the resource.")
  eTag: string;
}

model IgnoreResetRequirementsParameter {
  @doc("Ignores cache reset requirements.")
  @query("ignoreResetRequirements")
  skipIndexerResetRequirementForCache?: boolean;
}

model DisableCacheReprocessingChangeDetectionParameter {
  @doc("Disables cache reprocessing change detection.")
  @query
  disableCacheReprocessingChangeDetection?: boolean;
}

import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";
import "@typespec/spector";
import "@typespec/versioning";

using Azure.ClientGenerator.Core;
using Azure.Core;
using Spector;
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;

@doc("Defines a service-shaped HTTP flow for testing typed LRO status metadata.")
@scenarioService(
  "/azure/client-generator-core/lro/metadata",
  {
    versioned: Versions,
  }
)
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.lro.metadata",
  "java"
)
@global.Azure.ClientGenerator.Core.clientNamespace(
  "specs.azure.clientgenerator.core.lro.metadata",
  "python"
)
namespace _Specs_.Azure.ClientGenerator.Core.Lro.Metadata;

enum Versions {
  v2022_12_01_preview: "2022-12-01-preview",
}

model UsageDetails {
  documentPagesBasic?: int32;
  tokens?: Record<int32>;
}

model ContentAnalysisStatus {
  id: string;
  status: global.Azure.Core.Foundations.OperationState;

  @lroStatusMetadata
  usage?: UsageDetails;

  result?: ContentAnalysisResult;
}

model ContentAnalysisResult {
  contents: string;
}

@route("/analyzerResults/{operationId}")
@get
op getContentAnalysisStatus(
  @path operationId: string,
  ...global.Azure.Core.Foundations.ApiVersionParameter,
): ContentAnalysisStatus;

@scenario
@scenarioDoc("""
  Declares a Content Understanding-shaped flow for emitter tests of property-level
  `@lroStatusMetadata`.
  
  The optional `usage` value is a typed nested model with optional numeric fields and a token
  dictionary. The standard status-monitor `id` remains part of the response model and is not
  selected as auxiliary status metadata. Emitter-specific client tests can assert the generated
  public usage type and runtime value.
  
  Expected calls:
  - POST `/analyzers/analyzer-1:analyze` returns 202 with a status-monitor URI
  - GET the status-monitor URI returns a running status with nested `usage`
  - GET the status-monitor URI returns a succeeded status with nested `usage` and the result
  """)
@route("/analyzers/{analyzerId}:analyze")
@post
@pollingOperation(getContentAnalysisStatus)
op analyzeWithUsage(
  @path analyzerId: string,
  ...global.Azure.Core.Foundations.ApiVersionParameter,
): global.Azure.Core.Foundations.AcceptedResponse &
  global.Azure.Core.Foundations.LongRunningStatusLocation<ContentAnalysisStatus>;

model JobStatistics {
  total: int32;
  succeeded: int32;
  failed: int32;
}

@doc("An item-level diagnostic, independent of the structural LRO error.")
model JobItemError {
  code: string;
  message: string;
  target: string;
}

model JobTimestamps {
  @lroStatusMetadata
  createdDateTime: utcDateTime;

  @lroStatusMetadata
  lastUpdatedDateTime: utcDateTime;

  @lroStatusMetadata
  expirationDateTime: utcDateTime;
}

model LanguageJobStatus extends JobTimestamps {
  @lroStatusMetadata
  jobId: string;

  @lroStatusMetadata
  displayName: string;

  @lroStatusMetadata
  statistics?: JobStatistics;

  @lroStatusMetadata
  errors?: JobItemError[];

  status: global.Azure.Core.Foundations.OperationState;

  @lroErrorResult
  error?: global.Azure.Core.Foundations.Error;

  @lroResult
  result?: LanguageJobResult;
}

model LanguageJobResult {
  documents: string[];
}

@route("/jobs/{jobId}")
@get
op getLanguageJobStatus(
  @path jobId: string,
  ...global.Azure.Core.Foundations.ApiVersionParameter,
): LanguageJobStatus;

alias LanguageJobAcceptedResponse = global.Azure.Core.Foundations.AcceptedResponse<LanguageJobStatus> & {
  @pollingLocation
  @header("Operation-Location")
  operationLocation: ResourceLocation<LanguageJobStatus>;
};

@scenario
@scenarioDoc("""
  Declares a Language-shaped job with several property-level status metadata selections, including
  inherited timestamps. Emitter tests should expose the latest received metadata on the poller or
  operation rather than waiting for the logical final result.
  Expected calls:
  - POST `/jobs:analyze` returns 202 with the initial status-monitor body and polling URI;
    `statistics` and `errors` are absent
  - GET `/jobs/job-success` returns Running with one succeeded document and an updated timestamp
  - GET `/jobs/job-success` returns Succeeded with three succeeded documents, a newer timestamp,
    an empty auxiliary `errors` array, and the result
  """)
@route("/jobs:analyze")
@post
@pollingOperation(getLanguageJobStatus)
op analyzeJob(...global.Azure.Core.Foundations.ApiVersionParameter): LanguageJobAcceptedResponse;

@scenario
@scenarioDoc("""
  Declares a failed Language-shaped job using the same status-monitor model as `analyzeJob`.
  The auxiliary `errors` array contains item-level diagnostics and remains available as metadata
  even though the LRO fails. The separate structural `error` property is not selected as metadata.
  Emitter-specific tests must verify access on the poller or operation after handling its failure.
  Expected calls:
  - POST `/jobs/failure:analyze` returns 202 with the initial status-monitor body and polling URI
  - GET `/jobs/job-failure` returns Running with one succeeded document
  - GET `/jobs/job-failure` returns Failed with updated statistics, timestamp, item-level `errors`,
    and the structural `error`, without a logical result
  """)
@route("/jobs/failure:analyze")
@post
@pollingOperation(getLanguageJobStatus)
op analyzeJobWithFailure(
  ...global.Azure.Core.Foundations.ApiVersionParameter,
): LanguageJobAcceptedResponse;

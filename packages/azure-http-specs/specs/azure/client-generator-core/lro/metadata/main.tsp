import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";
import "@typespec/spector";
import "@typespec/versioning";

using Azure.ClientGenerator.Core;
using Azure.Core;
using Spector;
using TypeSpec.Http;
using TypeSpec.Versioning;

@doc("Defines service-shaped HTTP flows for testing client LRO metadata.")
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

model DocumentAnalysisStatus {
  id: string;
  status: global.Azure.Core.Foundations.OperationState;
  result?: DocumentAnalysisResult;
}

model DocumentAnalysisResult {
  summary: string;
}

@scenario
@scenarioDoc("""
  Declares a Document Intelligence-shaped flow for emitter tests of
  `@lroOperationId("lastPathSegment")`.

  The service returns the complete opaque status-monitor URI, including its API-version query.
  Polling must continue with that URI. Emitter-specific client tests can separately assert that
  the server-issued ID `analysis-123` is exposed from the final non-empty path segment.

  Expected calls:
  - POST `/documentModels/document-1:analyze` returns 202 with
    `Operation-Location: {endpoint}/documentModels/document-1/analyzeResults/analysis-123?api-version=2022-12-01-preview`
  - GET that exact status-monitor URI returns a running status
  - GET that exact status-monitor URI returns a succeeded status with the analysis result
  """)
@route("/documentModels/{modelId}:analyze")
@post
@lroOperationId("lastPathSegment")
op analyze(
  @path modelId: string,
  ...global.Azure.Core.Foundations.ApiVersionParameter,
): global.Azure.Core.Foundations.AcceptedResponse &
  global.Azure.Core.Foundations.LongRunningStatusLocation<DocumentAnalysisStatus>;

model UsageDetails {
  documentPagesBasic?: int32;
  tokens?: Record<int32>;
}

model ContentAnalysisStatus {
  id: string;
  status: global.Azure.Core.Foundations.OperationState;

  @lroPollingMetadata
  usage?: UsageDetails;

  result?: ContentAnalysisResult;
}

model ContentAnalysisResult {
  contents: string;
}

@scenario
@scenarioDoc("""
  Declares a Content Understanding-shaped flow for emitter tests of property-level
  `@lroPollingMetadata`.

  The optional `usage` value is a typed nested model with optional numeric fields and a token
  dictionary. Emitter-specific client tests can assert the generated public type and runtime value.

  Expected calls:
  - POST `/contentAnalyzers/analyzer-1:analyze` returns 202 with a status-monitor URI
  - GET the status-monitor URI returns a running status with nested `usage`
  - GET the status-monitor URI returns a succeeded status with nested `usage` and the result
  """)
@route("/contentAnalyzers/{analyzerId}:analyze")
@post
op analyzeWithUsage(
  @path analyzerId: string,
  ...global.Azure.Core.Foundations.ApiVersionParameter,
): global.Azure.Core.Foundations.AcceptedResponse &
  global.Azure.Core.Foundations.LongRunningStatusLocation<ContentAnalysisStatus>;

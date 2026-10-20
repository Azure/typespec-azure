import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";
import "@typespec/spector";
import "@typespec/versioning";

using Azure.ClientGenerator.Core;
using Azure.Core;
using Spector;
using TypeSpec.Http;
using TypeSpec.Versioning;

@doc("Defines a legacy service-shaped HTTP flow for testing URI-derived LRO operation identity.")
@scenarioService(
  "/azure/client-generator-core/lro/operation-id",
  {
    versioned: Versions,
  }
)
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.lro.operationid",
  "java"
)
@global.Azure.ClientGenerator.Core.clientNamespace(
  "specs.azure.clientgenerator.core.lro.operationid",
  "python"
)
namespace _Specs_.Azure.ClientGenerator.Core.Lro.OperationId;

enum Versions {
  v2022_12_01_preview: "2022-12-01-preview",
}

model DocumentAnalysisStatus {
  status: global.Azure.Core.Foundations.OperationState;
  result?: DocumentAnalysisResult;
}

model DocumentAnalysisResult {
  summary: string;
}

@route("/documentModels/{modelId}/analyzeResults/{resultId}")
@get
op getDocumentAnalysisStatus(
  @path modelId: string,

  @lroOperationId
  @path
  resultId: string,

  ...global.Azure.Core.Foundations.ApiVersionParameter,
): DocumentAnalysisStatus;

@scenario
@scenarioDoc("""
  Declares a legacy Document Intelligence-shaped flow for emitter tests of
  `@lroOperationId` on the status-monitor operation ID path parameter.
  
  The status-monitor body does not model the server-issued result ID. The service returns the
  complete opaque status-monitor URI, including its API-version query, and polling must continue
  with that URI. Emitter-specific client tests can separately expose `analysis-123` as operation
  identity by binding the decorated `resultId` parameter to the returned URI.
  
  Expected calls:
  - POST `/documentModels/document-1:analyze` returns 202 with
    `Operation-Location: {endpoint}/documentModels/document-1/analyzeResults/analysis-123?api-version=2022-12-01-preview`
  - GET that exact status-monitor URI returns a running status
  - GET that exact status-monitor URI returns a succeeded status with the analysis result
  """)
@route("/documentModels/{modelId}:analyze")
@post
@pollingOperation(getDocumentAnalysisStatus)
op analyze(
  @path modelId: string,
  ...global.Azure.Core.Foundations.ApiVersionParameter,
): global.Azure.Core.Foundations.AcceptedResponse &
  global.Azure.Core.Foundations.LongRunningStatusLocation<DocumentAnalysisStatus>;

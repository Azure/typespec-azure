import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";
import "@typespec/rest";
import "@typespec/spector";
import "@typespec/versioning";

using Azure.ClientGenerator.Core;
using Azure.Core;
using Azure.Core.Traits;
using Spector;
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;

@doc("Tests client metadata exposed for Azure long-running operations.")
@scenarioService(
  "/azure/client-generator-core/lro-metadata",
  {
    versioned: Versions,
  }
)
@global.Azure.ClientGenerator.Core.clientNamespace("azure.clientgenerator.core.lrometadata", "java")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "specs.azure.clientgenerator.core.lrometadata",
  "python"
)
namespace _Specs_.Azure.ClientGenerator.Core.LroMetadata;

enum Versions {
  v2022_12_01_preview: "2022-12-01-preview",
}

alias ResourceOperations = global.Azure.Core.ResourceOperations<NoConditionalRequests &
  NoRepeatableRequests &
  NoClientRequestId>;

@resource("analyzerResults")
model AnalyzerResultStatus {
  @key
  @visibility(Lifecycle.Read)
  id: string;

  status: global.Azure.Core.Foundations.OperationState;
  result?: AnalyzerResult;
}

model AnalyzerResult {
  summary: string;
}

op getAnalyzerResultStatus is ResourceOperations.ResourceRead<AnalyzerResultStatus>;

@scenario
@scenarioDoc("""
  Verifies that `@lroOperationId("lastPathSegment")` exposes the server-issued operation ID from
  the status-monitor URI without changing the polling protocol.

  The generated LRO method should expose `analysis-123`, derived from the final path segment of
  `Operation-Location`.

  Expected calls:
  - POST `/analyzers/document-1:analyze` returns 202 with
    `Operation-Location: {endpoint}/analyzerResults/analysis-123`
  - GET `/analyzerResults/analysis-123` returns a running status
  - GET `/analyzerResults/analysis-123` returns a succeeded status with the analysis result
  """)
@route("/analyzers/{analyzerId}:analyze")
@post
@pollingOperation(getAnalyzerResultStatus)
@lroOperationId("lastPathSegment")
op analyze(@path analyzerId: string): global.Azure.Core.Foundations.AcceptedResponse &
  global.Azure.Core.Foundations.LongRunningStatusLocation<AnalyzerResult>;

@resource("documentTranslationJobs")
model DocumentTranslationStatus {
  @key
  @visibility(Lifecycle.Read)
  id: string;

  status: global.Azure.Core.Foundations.OperationState;

  @encodedName("application/json", "percent_complete")
  @lroPollingMetadata
  percentComplete?: int32;

  result?: TranslationResult;
}

model TranslationResult {
  translatedDocumentUrl: url;
}

op getDocumentTranslationStatus is ResourceOperations.ResourceRead<DocumentTranslationStatus>;

@scenario
@scenarioDoc("""
  Verifies that property-level `@lroPollingMetadata` exposes a status-monitor property with its
  exact SDK type and serialization metadata.

  The generated LRO method should expose optional `int32` polling metadata named `percentComplete`,
  serialized on the wire as `percent_complete`.

  Expected calls:
  - POST `/documents/document-1:translate` returns 202 with
    `Operation-Location: {endpoint}/documentTranslationJobs/translation-123`
  - GET `/documentTranslationJobs/translation-123` returns a running status with
    `percent_complete: 50`
  - GET `/documentTranslationJobs/translation-123` returns a succeeded status with
    `percent_complete: 100` and the translation result
  """)
@route("/documents/{documentId}:translate")
@post
@pollingOperation(getDocumentTranslationStatus)
op translate(@path documentId: string): global.Azure.Core.Foundations.AcceptedResponse &
  global.Azure.Core.Foundations.LongRunningStatusLocation<TranslationResult>;

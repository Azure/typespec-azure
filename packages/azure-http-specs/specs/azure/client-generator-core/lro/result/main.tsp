import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";
import "@typespec/spector";
import "@typespec/versioning";

using Azure.ClientGenerator.Core;
using Azure.Core;
using global.Azure.Core.Traits;
using Spector;
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;

@scenarioService(
  "/azure/client-generator-core/lro/result",
  {
    versioned: Versions,
  }
)
@global.Azure.ClientGenerator.Core.clientNamespace("azure.clientgenerator.core.lro.result", "java")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "specs.azure.clientgenerator.core.lro.result",
  "python"
)
namespace _Specs_.Azure.ClientGenerator.Core.Lro.Result;

enum Versions {
  v2022_12_01_preview: "2022-12-01-preview",
}

alias Operations = global.Azure.Core.ResourceOperations<NoConditionalRequests &
  NoRepeatableRequests &
  NoClientRequestId>;

model JobResult {
  value: string;
}

@resource("jobs")
model Job {
  @key
  @visibility(Lifecycle.Read)
  id: string;

  @lroStatus
  status: "Running" | "Succeeded" | "Failed" | "Canceled";

  @lroResult
  result?: JobResult;
}

@route("/default/jobs/{id}")
@get
op getDefaultJob(@path id: string, ...global.Azure.Core.Foundations.ApiVersionParameter): Job;

@route("/default/jobs/{id}/status")
@get
op pollDefaultJob(@path id: string, ...global.Azure.Core.Foundations.ApiVersionParameter): Job;

@scenario
@scenarioDoc("""
  Verifies that a resource create-or-replace LRO returns the complete resource even when its
  polling model defines an `@lroResult` property.
  PUT /default/jobs/default with api-version=2022-12-01-preview and body {"status": "Running"}.
  Expect 201 with an Operation-Location pointing to /default/jobs/default/status.
  Poll until status is Succeeded, then GET /default/jobs/default with the same api-version.
  Expect the complete Job: {"id": "default", "status": "Succeeded", "result": {"value": "completed"}}.
  """)
@pollingOperation(pollDefaultJob)
@route("/default")
op createDefault is Operations.LongRunningResourceCreateOrReplace<Job>;

@route("/client-result/jobs/{id}")
@get
op getClientResultJob(@path id: string, ...global.Azure.Core.Foundations.ApiVersionParameter): Job;

@route("/client-result/jobs/{id}/status")
@get
op pollClientResultJob(@path id: string, ...global.Azure.Core.Foundations.ApiVersionParameter): Job;

#suppress "@azure-tools/typespec-client-generator-core/use-valid-client-lro-result" "Preserve the return type of an existing GA SDK."
@scenario
@scenarioDoc("""
  Verifies that `@clientLroResult` can preserve an existing SDK contract that returns the
  established result property of a resource LRO.
  PUT /client-result/jobs/client-result with api-version=2022-12-01-preview and body {"status": "Running"}.
  Expect 201 with an Operation-Location pointing to /client-result/jobs/client-result/status.
  Poll until status is Succeeded, then GET /client-result/jobs/client-result with the same api-version.
  Expect the selected JobResult: {"value": "completed"}, not the enclosing Job.
  """)
@pollingOperation(pollClientResultJob)
@route("/client-result")
op createWithClientLroResult is Operations.LongRunningResourceCreateOrReplace<Job>;

@@clientLroResult(createWithClientLroResult, Job.result);

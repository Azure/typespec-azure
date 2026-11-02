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

model JobResult {
  value: string;
}

@resource("jobs")
model Job {
  @key
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

alias JobAcceptedResponse = global.Azure.Core.Foundations.AcceptedResponse<Job> & {
  @pollingLocation
  @header("Operation-Location")
  operationLocation: ResourceLocation<Job>;
};

@scenario
@scenarioDoc("""
  Verifies that a resource create-or-replace LRO returns the complete resource even when its
  polling model defines an `@lroResult` property.
  """)
@pollingOperation(pollDefaultJob)
@createsOrReplacesResource(Job)
@route("/default/jobs/{id}")
@put
op createDefault(
  @path id: string,
  ...global.Azure.Core.Foundations.ApiVersionParameter,
): JobAcceptedResponse;

@route("/compatibility/jobs/{id}")
@get
op getCompatibilityJob(@path id: string, ...global.Azure.Core.Foundations.ApiVersionParameter): Job;

@route("/compatibility/jobs/{id}/status")
@get
op pollCompatibilityJob(
  @path id: string,
  ...global.Azure.Core.Foundations.ApiVersionParameter,
): Job;

#suppress "@azure-tools/typespec-client-generator-core/use-valid-client-lro-result" "Preserve the return type of an existing GA SDK."
@scenario
@scenarioDoc("""
  Verifies that `@clientLroResult` can preserve an existing SDK contract that returns the
  established result property of a resource LRO.
  """)
@pollingOperation(pollCompatibilityJob)
@createsOrReplacesResource(Job)
@route("/compatibility/jobs/{id}")
@put
op createCompatibility(
  @path id: string,
  ...global.Azure.Core.Foundations.ApiVersionParameter,
): JobAcceptedResponse;

@@clientLroResult(createCompatibility, Job.result);

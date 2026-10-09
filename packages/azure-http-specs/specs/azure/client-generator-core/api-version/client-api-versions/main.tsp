import "@typespec/http";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Versioning;
using Azure.ClientGenerator.Core;
using Spector;

@scenarioService(
  "/azure/client-generator-core/api-version/client-api-versions",
  {
    versioned: ServiceApiVersions,
  }
)
namespace Azure.ClientGenerator.Core.ApiVersion.ClientApiVersions;

@doc("Service supported api versions.")
enum ServiceApiVersions {
  @doc("Service api version 2024-01-01.")
  v2024_01_01: "2024-01-01",
}

// Extend the client api version enum with an older version not present in the service versions.
// The client enum includes "2022-10-01" in addition to all service versions.
enum ClientApiVersions {
  v2022_10_01: "2022-10-01",
  ...ServiceApiVersions,
}

@@clientApiVersions(Azure.ClientGenerator.Core.ApiVersion.ClientApiVersions, ClientApiVersions);

@scenario
@scenarioDoc("""
  Test that the client sends the api-version from @clientApiVersions decorator.
  The client api version enum is extended with an older version "2022-10-01" not present in the service versions.
  The client should be able to send "2022-10-01" as the api-version query parameter.
  """)
@doc("Test api version parameter from clientApiVersions.")
@post
op sendApiVersion(@query("api-version") apiVersion: string): OkResponse;

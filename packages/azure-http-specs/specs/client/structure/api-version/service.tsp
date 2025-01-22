import "@typespec/http";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using TypeSpec.Versioning;
using Azure.ClientGenerator.Core;
using Spector;

@doc("""
  Test alternate api version scenarios.
  """)
@server(
  "{endpoint}/client/structure/api-version",
  "",
  {
    @doc("Need to be set as 'http://localhost:3000' in client.")
    endpoint: url,
  }
)
@service({
  title: "ApiVersionClient",
})
@scenarioService("/client/structure/api-version")
@versioned(ApiVersions)
namespace Client.AlternateApiVersion.Service;

@doc("Supported api versions.")
enum ApiVersions {
  @doc("Api version 2025-01-01.")
  @useDependency(Azure.Core.Versions.v1_0_Preview_2)
  v2025_01_01: "2025-01-01",
}

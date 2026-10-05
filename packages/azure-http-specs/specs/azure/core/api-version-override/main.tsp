import "@typespec/http";
import "@typespec/spector";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";

using Spector;
using TypeSpec.Http;
using TypeSpec.Versioning;

@scenarioService(
  "/azure/core/api-version-override",
  {
    versioned: Versions,
  }
)
@global.Azure.ClientGenerator.Core.clientNamespace("specs.azure.core.apiversionoverride", "python")
namespace _Specs_.Azure.Core.ApiVersionOverride;

@doc("The versions supported by the service.")
enum Versions {
  @doc("The current service API version.")
  v2025_01_01: "2025-01-01",
}

@route("/legacy")
@global.Azure.Core.Legacy.overrideApiVersion("2022-10-01")
interface LegacyClient {
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "For testing an API-version override."
  @scenario
  @scenarioDoc("""
    Verifies that an API-version override on a child client replaces the default service API version.
    The client call takes no API-version argument and must send the overridden query parameter
    `api-version=2022-10-01` instead of the service version `2025-01-01`.
    """)
  @doc("Sends the API-version configured for this child client.")
  @get
  get(...global.Azure.Core.Foundations.ApiVersionParameter): OkResponse;
}

import "@typespec/http";
import "@typespec/rest";
import "@typespec/spector";
import "@typespec/versioning";

using Http;
using Rest;
using Versioning;
using Spector;

/** Test for loading a unified YAML example and generating sample code. */
@scenarioService(
  "/azure/example/unified",
  {
    versioned: Versions,
  }
)
@scenario
@scenarioDoc("""
  Generate sample code using the unified YAML example at examples.yaml.
  Do not set "examples-dir"; the scenario-local tspconfig.yaml enables discovery.
  Expected sample provenance: examples.yaml#basic.
  The request and response match azure/example/basic.
  """)
namespace _Specs_.Azure.Example.Unified;

enum Versions {
  v2022_12_01_preview: "2022-12-01-preview",
}

model ApiVersionParameter {
  @query("api-version")
  @minLength(1)
  @doc("The API version to use for this operation.")
  apiVersion: string;
}

model ActionRequest {
  stringProperty: string;
  modelProperty?: Model;
  arrayProperty?: Array<string>;
  recordProperty?: Record<string>;
}

model Model {
  int32Property?: int32;
  float32Property?: float32;
  enumProperty?: Enum;
}

union Enum {
  string,
  "EnumValue1",
}

model ActionResponse is ActionRequest;

interface ServiceOperationGroup {
  #suppress "@typespec/spector/missing-scenario" "scenario defined in client.tsp"
  @route("/basic")
  @post
  basic(
    ...ApiVersionParameter,
    @query("query-param") queryParam: string,
    @header("header-param") headerParam: string,
    @body body: ActionRequest,
  ): ActionResponse;
}

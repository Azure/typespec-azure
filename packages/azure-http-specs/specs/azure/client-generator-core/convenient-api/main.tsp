import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for @convenientAPI and @protocolAPI decorators.")
@scenarioService("/azure/client-generator-core/convenient-api")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.convenientapi",
  "java"
)
namespace _Specs_.Azure.ClientGenerator.Core.ConvenientApi;

model Resource {
  name: string;
  description?: string;
}

@scenario
@scenarioDoc("""
  This scenario tests @convenientAPI(false) on an operation, meaning only a protocol method
  should be generated. The convenience method should NOT be generated.
  Expected query parameter: name="sample"
  Expected response body:
  ```json
  { "name": "sample" }
  ```
  """)
namespace ConvenientOnly {
  @route("/protocolOnly")
  @get
  @global.Azure.ClientGenerator.Core.convenientAPI(false)
  op protocolOnlyOp(@query name: string): Resource;
}

@scenario
@scenarioDoc("""
  This scenario tests @protocolAPI(false) on an operation, meaning only a convenience method
  should be generated. The protocol method should NOT be generated.
  Expected query parameter: name="sample"
  Expected response body:
  ```json
  { "name": "sample" }
  ```
  """)
namespace ProtocolOnly {
  @route("/convenientOnly")
  @get
  @global.Azure.ClientGenerator.Core.protocolAPI(false)
  op convenientOnlyOp(@query name: string): Resource;
}

@scenario
@scenarioDoc("""
  This scenario tests both @convenientAPI and @protocolAPI enabled (default behavior).
  Both protocol and convenience methods should be generated.
  Expected query parameter: name="sample"
  Expected response body:
  ```json
  { "name": "sample" }
  ```
  """)
namespace Both {
  @route("/both")
  @get
  op bothOp(@query name: string): Resource;
}

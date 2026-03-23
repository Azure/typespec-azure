import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using global.Azure.ClientGenerator.Core;
using Spector;

@doc("Test decorators @protocolAPI and @convenientAPI.")
@scenarioService("/azure/client-generator-core/protocol-and-convenient")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.protocolandconvenient",
  "java"
)
namespace _Specs_.Azure.ClientGenerator.Core.ProtocolAndConvenient;

model Resource {
  name: string;
}

@route("/onlyConvenient")
@scenario
@scenarioDoc("""
  This scenario tests an operation with @convenientAPI(true) and @protocolAPI(false).
  The operation should only generate a convenience method, not a protocol method.
  Expected query parameter: name="sample"
  Expected response body:
  ```json
  {
    "name": "sample"
  }
  ```
  """)
namespace OnlyConvenient {
  @route("/get")
  @get
  @convenientAPI(true)
  @protocolAPI(false)
  op get(@query name: string): Resource;
}

@route("/onlyProtocol")
@scenario
@scenarioDoc("""
  This scenario tests an operation with @protocolAPI(true) and @convenientAPI(false).
  The operation should only generate a protocol method, not a convenience method.
  Expected query parameter: name="sample"
  Expected response body:
  ```json
  {
    "name": "sample"
  }
  ```
  """)
namespace OnlyProtocol {
  @route("/get")
  @get
  @protocolAPI(true)
  @convenientAPI(false)
  op get(@query name: string): Resource;
}

@route("/both")
@scenario
@scenarioDoc("""
  This scenario tests an operation with both @protocolAPI(true) and @convenientAPI(true) (the default).
  The operation should generate both protocol and convenience methods.
  Expected query parameter: name="sample"
  Expected response body:
  ```json
  {
    "name": "sample"
  }
  ```
  """)
namespace Both {
  @route("/get")
  @get
  @protocolAPI(true)
  @convenientAPI(true)
  op get(@query name: string): Resource;
}

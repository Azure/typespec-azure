import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;

@doc("Test for @convenientAPI and @protocolAPI decorators.")
@scenarioService("/azure/client-generator-core/convenient-api")
namespace _Specs_.Azure.ClientGenerator.Core.ConvenientApi;

model Widget {
  name: string;
  color: string;
}

@scenario
@scenarioDoc("""
  This scenario tests the @protocolAPI(false) and @convenientAPI decorators.
  There are three operations:
  - `protocolAndConvenient` should generate both protocol and convenience methods (default behavior).
  - `convenientOnly` should generate only a convenience method because @protocolAPI is set to false.
  - `protocolOnly` should generate only a protocol method because @convenientAPI is set to false.
  
  Expected calls:
  - GET /azure/client-generator-core/convenient-api/protocolAndConvenient -> 200 with Widget body
  - GET /azure/client-generator-core/convenient-api/convenientOnly -> 200 with Widget body
  - GET /azure/client-generator-core/convenient-api/protocolOnly -> 200 with Widget body
  """)
namespace MethodControl {
  @doc("""
    Expected response body:
    ```json
    {
      "name": "Widget1",
      "color": "red"
    }
    ```
    """)
  @route("/protocolAndConvenient")
  @get
  op protocolAndConvenient(): Widget;

  @doc("""
    This operation should only have a convenience method, not a protocol method.
    
    Expected response body:
    ```json
    {
      "name": "Widget1",
      "color": "red"
    }
    ```
    """)
  @global.Azure.ClientGenerator.Core.protocolAPI(false)
  @route("/convenientOnly")
  @get
  op convenientOnly(): Widget;

  @doc("""
    This operation should only have a protocol method, not a convenience method.
    
    Expected response body:
    ```json
    {
      "name": "Widget1",
      "color": "red"
    }
    ```
    """)
  @global.Azure.ClientGenerator.Core.convenientAPI(false)
  @route("/protocolOnly")
  @get
  op protocolOnly(): Widget;
}

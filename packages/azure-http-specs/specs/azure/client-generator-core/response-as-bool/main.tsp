import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;

@doc("Test for @responseAsBool decorator.")
@scenarioService("/azure/client-generator-core/response-as-bool")
namespace _Specs_.Azure.ClientGenerator.Core.ResponseAsBool;

model Resource {
  name: string;
}

@scenario
@scenarioDoc("""
  Test that a HEAD operation decorated with @responseAsBool returns a boolean.
  A successful (2xx) response should return true, and a 404 response should return false.
  
  Expected calls:
  - HEAD /azure/client-generator-core/response-as-bool/exists -> 200 (returns true)
  """)
@route("/exists")
namespace HeadAsBoolean {
  @global.Azure.ClientGenerator.Core.responseAsBool
  @head
  op exists(@query name: string): void;
}

import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using global.Azure.ClientGenerator.Core;
using Spector;

@doc("Test decorator @responseAsBool on HEAD operations.")
@scenarioService("/azure/client-generator-core/response-as-bool")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.responseasbool",
  "java"
)
namespace _Specs_.Azure.ClientGenerator.Core.ResponseAsBool;

@scenario
@scenarioDoc("""
  Test that a HEAD operation decorated with @responseAsBool returns a boolean value.
  When the resource exists, the service returns 204 No Content and the client should return true.
  When the resource does not exist, the service returns 404 Not Found and the client should return false.
  
  Expected behavior:
  - HEAD /azure/client-generator-core/response-as-bool/exists → 204 → client returns true
  - HEAD /azure/client-generator-core/response-as-bool/exists → 404 → client returns false
  """)
@route("/exists")
@responseAsBool
@head
op exists(): void;

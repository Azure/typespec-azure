import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Azure.ClientGenerator.Core;
using Spector;

@doc("Test for @responseAsBool decorator.")
@scenarioService("/azure/client-generator-core/response-as-bool")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.responseasbool",
  "java"
)
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
  - HEAD /azure/client-generator-core/response-as-bool/not-exists -> 404 (returns false)
  """)
@route("/exists")
namespace HeadAsBoolean {
  @global.Azure.ClientGenerator.Core.responseAsBool
  @head
  op exists(): void;

  @global.Azure.ClientGenerator.Core.responseAsBool
  @head
  @route("/not-exists")
  op notExists(): void;
}

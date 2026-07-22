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
@global.Azure.ClientGenerator.Core.clientNamespace(
  "specs.azure.clientgenerator.core.responseasbool",
  "python"
)
namespace _Specs_.Azure.ClientGenerator.Core.ResponseAsBool;

model Resource {
  name: string;
}

@route("/exists")
namespace HeadAsBoolean {
  @scenario
  @scenarioDoc("""
    Test that a HEAD operation decorated with @responseAsBool returns true for a successful (2xx) response.
    
    Expected call:
    - HEAD /azure/client-generator-core/response-as-bool/exists -> 204 (returns true)
    """)
  @global.Azure.ClientGenerator.Core.responseAsBool
  @head
  op exists(): void;

  @scenario
  @scenarioDoc("""
    Test that a HEAD operation decorated with @responseAsBool returns false for a 404 response.
    
    Expected call:
    - HEAD /azure/client-generator-core/response-as-bool/exists/not-exists -> 404 (returns false)
    """)
  @route("/not-exists")
  @global.Azure.ClientGenerator.Core.responseAsBool
  @head
  op notExists(): void;
}

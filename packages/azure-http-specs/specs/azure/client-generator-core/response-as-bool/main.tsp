import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using global.Azure.ClientGenerator.Core;
using Spector;

@doc("Test decorator @responseAsBool.")
@scenarioService("/azure/client-generator-core/response-as-bool")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.responseasbool",
  "java"
)
namespace _Specs_.Azure.ClientGenerator.Core.ResponseAsBool;

@route("/exists")
@scenario
@scenarioDoc("""
  This scenario tests the @responseAsBool decorator on a HEAD operation.
  The operation should return a boolean: true for 204 (resource exists) and false for 404 (resource not found).
  Expected response: 204 No Content (maps to true)
  """)
namespace Exists {
  @route("/{name}")
  @head
  @responseAsBool
  op exists(@path name: string): void;
}

import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using global.Azure.ClientGenerator.Core;
using Spector;

@doc("Test decorator @responseAsBool for HEAD operations.")
@scenarioService("/azure/client-generator-core/response-as-bool")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.responseasbool",
  "java"
)
namespace _Specs_.Azure.ClientGenerator.Core.ResponseAsBool;

@scenario
@scenarioDoc("""
  This scenario tests that a HEAD operation with @responseAsBool returns true for a 2xx response.
  The client method should return a boolean value.
  A 2xx response should return true.
  Expected path parameter: id="existing"
  Expected response status: 200
  Expected return value: true
  """)
@route("/exists/{id}")
@head
@responseAsBool
op exists(@path id: string): void;

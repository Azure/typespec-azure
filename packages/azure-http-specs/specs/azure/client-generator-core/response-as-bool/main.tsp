import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for @responseAsBool decorator on HEAD operations.")
@scenarioService("/azure/client-generator-core/response-as-bool")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.responseasbool",
  "java"
)
namespace _Specs_.Azure.ClientGenerator.Core.ResponseAsBool;

@scenario
@scenarioDoc("""
  This scenario tests @responseAsBool on a HEAD operation that returns 200 (exists).
  The generated method should return `true` for 2xx responses.
  Expected request: HEAD /azure/client-generator-core/response-as-bool/exists/found
  Expected response: 200
  """)
namespace Exists {
  @route("/exists/found")
  @head
  @global.Azure.ClientGenerator.Core.responseAsBool
  op found(@query name: string): OkResponse;
}

@scenario
@scenarioDoc("""
  This scenario tests @responseAsBool on a HEAD operation that returns 404 (not found).
  The generated method should return `false` for 404 responses.
  Expected request: HEAD /azure/client-generator-core/response-as-bool/exists/notFound
  Expected response: 404
  """)
namespace NotExists {
  @route("/exists/notFound")
  @head
  @global.Azure.ClientGenerator.Core.responseAsBool
  op notFound(@query name: string): OkResponse | NotFoundResponse;
}

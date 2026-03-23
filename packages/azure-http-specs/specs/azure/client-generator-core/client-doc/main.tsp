import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using global.Azure.ClientGenerator.Core;
using Spector;

@doc("Test decorator @clientDoc.")
@scenarioService("/azure/client-generator-core/client-doc")
@global.Azure.ClientGenerator.Core.clientNamespace("azure.clientgenerator.core.clientdoc", "java")
namespace _Specs_.Azure.ClientGenerator.Core.ClientDoc;

@doc("A simple model used for testing client documentation.")
@clientDoc(
  "This is the client documentation for the model, replacing the original.",
  DocumentationMode.replace
)
model SimpleModel {
  @doc("The name property.")
  @clientDoc("The client name property with appended info.", DocumentationMode.append)
  name: string;
}

@route("/replaceDoc")
@scenario
@scenarioDoc("""
  This scenario tests @clientDoc with DocumentationMode.replace on a model.
  The generated client model documentation should be replaced with the client-specific documentation.
  Expected response body:
  ```json
  {
    "name": "sample"
  }
  ```
  """)
namespace ReplaceDoc {
  @route("/get")
  @get
  op get(): SimpleModel;
}

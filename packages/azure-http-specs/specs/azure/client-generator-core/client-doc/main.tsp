import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using global.Azure.ClientGenerator.Core;
using Spector;

@doc("Test decorator @clientDoc for overriding documentation in generated client libraries.")
@scenarioService("/azure/client-generator-core/client-doc")
@global.Azure.ClientGenerator.Core.clientNamespace("azure.clientgenerator.core.clientdoc", "java")
namespace _Specs_.Azure.ClientGenerator.Core.ClientDoc;

@doc("Service documentation for the model.")
@clientDoc(
  "Client documentation that replaces the service documentation.",
  DocumentationMode.replace
)
model ReplaceModel {
  @doc("Service documentation for the property.")
  @clientDoc("Client documentation for name property.", DocumentationMode.replace)
  name: string;
}

@doc("Service documentation for the model.")
@clientDoc("Additional client-specific notes.", DocumentationMode.append)
model AppendModel {
  @doc("Service documentation for the property.")
  @clientDoc("Extra details for the property.", DocumentationMode.append)
  name: string;
}

@scenario
@scenarioDoc("""
  This scenario tests that @clientDoc with DocumentationMode.replace replaces the service documentation.
  The generated model "ReplaceModel" should have documentation "Client documentation that replaces the service documentation."
  The property "name" should have documentation "Client documentation for name property."
  Expected query parameter: name="test"
  Expected response body:
  ```json
  {
    "name": "test"
  }
  ```
  """)
@route("/replace")
@get
op getReplace(@query name: string): ReplaceModel;

@scenario
@scenarioDoc("""
  This scenario tests that @clientDoc with DocumentationMode.append appends to the service documentation.
  The generated model "AppendModel" should have documentation "Service documentation for the model. Additional client-specific notes."
  The property "name" should have documentation "Service documentation for the property. Extra details for the property."
  Expected query parameter: name="test"
  Expected response body:
  ```json
  {
    "name": "test"
  }
  ```
  """)
@route("/append")
@get
op getAppend(@query name: string): AppendModel;

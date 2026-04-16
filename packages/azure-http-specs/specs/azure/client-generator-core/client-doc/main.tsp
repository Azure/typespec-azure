import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Azure.ClientGenerator.Core;
using Spector;

@doc("Test for @clientDoc decorator.")
@scenarioService("/azure/client-generator-core/client-doc")
@global.Azure.ClientGenerator.Core.clientNamespace("azure.clientgenerator.core.clientdoc", "java")
namespace _Specs_.Azure.ClientGenerator.Core.ClientDoc;

@scenario
@scenarioDoc("""
  This scenario tests the @clientDoc decorator which overrides documentation for types in client libraries.
  The 'Plant' model has a base doc from TypeSpec and additional client-specific documentation appended via @clientDoc in append mode.
  The 'harvest' operation has its documentation completely replaced by @clientDoc in replace mode.
  
  Expected calls:
  - POST /azure/client-generator-core/client-doc/harvest -> 200 with Plant body
  """)
namespace Documentation {
  @doc("A plant in the garden.")
  @global.Azure.ClientGenerator.Core.clientDoc(
    "This model is used to represent a plant in the client SDK.",
    global.Azure.ClientGenerator.Core.DocumentationMode.append
  )
  model Plant {
    @doc("The name of the plant.")
    name: string;

    @doc("The species of the plant.")
    species: string;
  }

  @doc("Internal operation to get a plant.")
  @global.Azure.ClientGenerator.Core.clientDoc(
    "Retrieves a plant from the garden by submitting its name.",
    global.Azure.ClientGenerator.Core.DocumentationMode.replace
  )
  @route("/harvest")
  @post
  op harvest(@body body: Plant): Plant;
}

import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for @clientDoc decorator to override or append client documentation.")
@scenarioService("/azure/client-generator-core/client-doc")
@global.Azure.ClientGenerator.Core.clientNamespace("azure.clientgenerator.core.clientdoc", "java")
namespace _Specs_.Azure.ClientGenerator.Core.ClientDoc;

@scenario
@scenarioDoc("""
  This scenario tests @clientDoc with append mode.
  The operation's original doc is "Gets a resource."
  After applying @clientDoc in append mode, the client documentation should be:
  "Gets a resource. Returns null if the resource is not found."
  
  Expected query parameter: name="sample"
  Expected response body:
  ```json
  { "name": "sample" }
  ```
  """)
namespace AppendDoc {
  model Resource {
    name: string;
  }

  /** Gets a resource. */
  @route("/appendDoc")
  @get
  op getResource(@query name: string): Resource;
}

@@global.Azure.ClientGenerator.Core.clientDoc(AppendDoc.getResource,
  "Returns null if the resource is not found.",
  global.Azure.ClientGenerator.Core.DocumentationMode.append
);

@scenario
@scenarioDoc("""
  This scenario tests @clientDoc with replace mode.
  The operation's original doc is "Gets a resource."
  After applying @clientDoc in replace mode, the client documentation should be:
  "Fetch the named resource from the service."
  
  Expected query parameter: name="sample"
  Expected response body:
  ```json
  { "name": "sample" }
  ```
  """)
namespace ReplaceDoc {
  model Resource {
    name: string;
  }

  /** Gets a resource. */
  @route("/replaceDoc")
  @get
  op getResource(@query name: string): Resource;
}

@@global.Azure.ClientGenerator.Core.clientDoc(ReplaceDoc.getResource,
  "Fetch the named resource from the service.",
  global.Azure.ClientGenerator.Core.DocumentationMode.replace
);

import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Azure.ClientGenerator.Core;
using Spector;

@doc("Test for the exact() function used with @clientName to preserve exact naming.")
@scenarioService("/azure/client-generator-core/exact-name")
@global.Azure.ClientGenerator.Core.clientNamespace("azure.clientgenerator.core.exactname", "java")
namespace _Specs_.Azure.ClientGenerator.Core.ExactName;

@scenario
@scenarioDoc("""
  This scenario tests the exact() function which prevents language emitters from applying
  casing transformations to client names. The model 'ExactModel' is renamed to 'my_model'
  using exact(), meaning all languages should preserve the name 'my_model' without any
  casing conversion (e.g., Python should NOT convert to 'MyModel' class name,
  and C# should NOT convert to 'MyModel').
  
  Expected request body:
  ```json
  {
    "name": "test"
  }
  ```
  Expected response body:
  ```json
  {
    "name": "test"
  }
  ```
  """)
namespace Model {
  #suppress "experimental-feature" "exact"
  @global.Azure.ClientGenerator.Core.clientName(global.Azure.ClientGenerator.Core.exact("my_model"))
  model ExactModel {
    name: string;
  }

  @route("/model")
  @post
  op send(@body body: ExactModel): ExactModel;
}

@scenario
@scenarioDoc("""
  This scenario tests the exact() function applied to a model property with language scoping.
  The property 'name' on ScopedModel is renamed to 'my_name' using exact() scoped to each language.
  Each language should preserve the exact name 'my_name' as-is without any casing conversion.
  
  Expected request body:
  ```json
  {
    "name": "test"
  }
  ```
  Expected response body:
  ```json
  {
    "name": "test"
  }
  ```
  """)
namespace Property {
  model ScopedModel {
    #suppress "experimental-feature" "exact"
    #suppress "experimental-feature" "exact"
    #suppress "experimental-feature" "exact"
    #suppress "experimental-feature" "exact"
    #suppress "experimental-feature" "exact"
    @global.Azure.ClientGenerator.Core.clientName(
      global.Azure.ClientGenerator.Core.exact("my_name"),
      "python"
    )
    @global.Azure.ClientGenerator.Core.clientName(
      global.Azure.ClientGenerator.Core.exact("my_name"),
      "java"
    )
    @global.Azure.ClientGenerator.Core.clientName(
      global.Azure.ClientGenerator.Core.exact("my_name"),
      "csharp"
    )
    @global.Azure.ClientGenerator.Core.clientName(
      global.Azure.ClientGenerator.Core.exact("my_name"),
      "javascript"
    )
    @global.Azure.ClientGenerator.Core.clientName(
      global.Azure.ClientGenerator.Core.exact("my_name"),
      "go"
    )
    name: string;
  }

  @route("/property")
  @post
  op send(@body body: ScopedModel): ScopedModel;
}

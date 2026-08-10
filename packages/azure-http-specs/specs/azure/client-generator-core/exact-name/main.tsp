import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Azure.ClientGenerator.Core;
using Spector;

@doc("Test for the exact() function used with @clientName to preserve exact naming.")
@scenarioService("/azure/client-generator-core/exact-name")
@global.Azure.ClientGenerator.Core.clientNamespace("azure.clientgenerator.core.exactname", "java")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "specs.azure.clientgenerator.core.exactname",
  "python"
)
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
  The property 'name' on ScopedModel is renamed using exact() scoped to each language,
  with names that include an underscore prefix to verify that language naming logic does not apply:
  - Python: '_my_name' (should not be converted to 'my_name' or other casing)
  - Java: '_myName' (should not be converted to remove the underscore prefix)
  - C#: '_MyName' (should not be converted to remove the underscore prefix)
  - JavaScript: '_myName' (should not be converted to remove the underscore prefix)
  - Go: '_MyName' (should not be converted to remove the underscore prefix)
  Each language should preserve the specified exact name as-is without any further casing conversion.
  
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
    @global.Azure.ClientGenerator.Core.clientName(
      global.Azure.ClientGenerator.Core.exact("_my_name"),
      "python"
    )
    @global.Azure.ClientGenerator.Core.clientName(
      global.Azure.ClientGenerator.Core.exact("_myName"),
      "java"
    )
    @global.Azure.ClientGenerator.Core.clientName(
      global.Azure.ClientGenerator.Core.exact("_MyName"),
      "csharp"
    )
    @global.Azure.ClientGenerator.Core.clientName(
      global.Azure.ClientGenerator.Core.exact("_myName"),
      "javascript"
    )
    @global.Azure.ClientGenerator.Core.clientName(
      global.Azure.ClientGenerator.Core.exact("_MyName"),
      "go"
    )
    name: string;
  }

  @route("/property")
  @post
  op send(@body body: ScopedModel): ScopedModel;
}

@scenario
@scenarioDoc("""
  This scenario tests the exact() function applied to an enum value.
  The union AgentEndpointProtocol has a member 'a2a' which is renamed using exact("A2A")
  scoped per language. Emitters should preserve the exact enum value name 'A2A' without
  applying their usual casing conventions (e.g., Python should NOT convert to 'A_2_A',
  and C# should NOT convert to 'A2A' → 'A2a' or any other transformation).
  
  Expected request body:
  ```json
  {
    "protocol": "a2a"
  }
  ```
  Expected response body:
  ```json
  {
    "protocol": "a2a"
  }
  ```
  """)
namespace EnumValue {
  union AgentEndpointProtocol {
    string,
    activity: "activity",
    responses: "responses",

    #suppress "experimental-feature" "exact"
    @global.Azure.ClientGenerator.Core.clientName(global.Azure.ClientGenerator.Core.exact("A2A"))
    a2a: "a2a",

    mcp: "mcp",
  }

  model EndpointConfig {
    protocol: AgentEndpointProtocol;
  }

  @route("/enum-value")
  @post
  op send(@body body: EndpointConfig): EndpointConfig;
}

@scenario
@scenarioDoc("""
  This scenario tests the exact() function applied to an operation name.
  The operation 'myOp' is renamed using exact("myOp") scoped per language.
  Emitters should preserve the exact operation name without applying their usual
  casing conventions (e.g., Python should NOT convert to 'my_op',
  and C# should NOT convert to 'MyOp').
  
  Expected response: 204 No Content
  """)
namespace Operation {
  #suppress "experimental-feature" "exact"
  @global.Azure.ClientGenerator.Core.clientName(global.Azure.ClientGenerator.Core.exact("myOp"))
  @route("/operation")
  @get
  op myOp(): void;
}

@scenario
@scenarioDoc("""
  This scenario tests the exact() function applied to a parameter name.
  The query parameter 'myParam' is renamed using exact("myParam") scoped per language.
  Emitters should preserve the exact parameter name without applying their usual
  casing conventions (e.g., Python should NOT convert to 'my_param',
  and C# should NOT convert to 'MyParam').
  
  Expected query parameter:
  myParam: hello
  
  Expected response: 204 No Content
  """)
namespace Parameter {
  #suppress "experimental-feature" "exact"
  @route("/parameter")
  @get
  op send(
    @query
    @global.Azure.ClientGenerator.Core.clientName(
      global.Azure.ClientGenerator.Core.exact("myParam")
    )
    myParam: string,
  ): void;
}

import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Azure.ClientGenerator.Core;
using Spector;

@doc("Test for `@clientDefaultValue` decorator.")
@scenarioService("/azure/client-generator-core/client-default-value")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.clientdefaultvalue",
  "java"
)
@global.Azure.ClientGenerator.Core.clientNamespace(
  "specs.azure.clientgenerator.core.clientdefaultvalue",
  "python"
)
namespace _Specs_.Azure.ClientGenerator.Core.ClientDefaultValue;

@doc("Model with client default values on properties.")
model ModelWithDefaultValues {
  @doc("Name property with no default value.")
  name: string;

  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing legacy decorator"
  @doc("Timeout property with client default value of 30.")
  @global.Azure.ClientGenerator.Core.Legacy.clientDefaultValue(30)
  timeout?: int32;

  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing legacy decorator"
  @doc("Tier property with client default value of 'standard'.")
  @global.Azure.ClientGenerator.Core.Legacy.clientDefaultValue("standard")
  tier?: string;

  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing legacy decorator"
  @doc("Retry property with client default value of true.")
  @global.Azure.ClientGenerator.Core.Legacy.clientDefaultValue(true)
  retry?: boolean;
}

@scenario
@route("/model-property")
@scenarioDoc("""
  Test case 1: `@clientDefaultValue` for model property.
  This scenario tests that client default values are correctly applied to model properties.
  
  Expected input body:
  ```json
  {
    "name": "test"
  }
  ```
  
  Expected response body:
  ```json
  {
    "name": "test",
    "timeout": 30,
    "tier": "standard",
    "retry": true
  }
  ```
  """)
@put
op putModelProperty(@body body: ModelWithDefaultValues): ModelWithDefaultValues;

@scenario
@route("/operation-parameter")
@scenarioDoc("""
  Test case 2: `@clientDefaultValue` for operation parameter.
  This scenario tests that client default values are correctly applied to operation parameters.
  
  Expected query parameter:
  name: "test"
  pageSize: 10 (default)
  format: "json" (default)
  
  Expected response: 204 No Content
  """)
@get
op getOperationParameter(
  @query name: string,

  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing legacy decorator"
  @global.Azure.ClientGenerator.Core.Legacy.clientDefaultValue(10)
  @query
  pageSize?: int32,

  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing legacy decorator"
  @global.Azure.ClientGenerator.Core.Legacy.clientDefaultValue("json")
  @query
  format?: string,
): void;

@scenario
@route("/path-parameter/{segment1}/{segment2}")
@scenarioDoc("""
  Test case 3: `@clientDefaultValue` for first path segment.
  This scenario has 2 path segments and tests client default value on the first segment.
  
  Expected path parameters:
  segment1: "default-segment1" (default)
  segment2: "segment2"
  
  Expected response: 204 No Content
  """)
@get
op getPathParameter(
  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing legacy decorator"
  @global.Azure.ClientGenerator.Core.Legacy.clientDefaultValue("default-segment1")
  @path
  segment1: string,

  @path segment2: string,
): void;

@scenario
@route("/header-parameter")
@scenarioDoc("""
  Test case 4: `@clientDefaultValue` for header parameters.
  This scenario tests that client default values are correctly applied to header parameters.
  
  Expected header parameters:
  Accept: "application/json;odata.metadata=none" (default)
  x-custom-header: "default-value" (default)
  
  Expected response: 204 No Content
  """)
@get
op getHeaderParameter(
  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing legacy decorator"
  @global.Azure.ClientGenerator.Core.Legacy.clientDefaultValue("application/json;odata.metadata=none")
  @header("Accept")
  accept?: string,

  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing legacy decorator"
  @global.Azure.ClientGenerator.Core.Legacy.clientDefaultValue("default-value")
  @header("x-custom-header")
  customHeader?: string,
): void;

import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using global.Azure.ClientGenerator.Core;
using Spector;

@doc("Illustrates the model flatten cases.")
@scenarioService("/azure/client-generator-core/flatten-property")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.flattenproperty",
  "java"
)
namespace _Specs_.Azure.ClientGenerator.Core.FlattenProperty;

@doc("This is the model with one level of flattening.")
model FlattenModel {
  name: string;

  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing backcompat"
  @global.Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: ChildModel;
}

@doc("This is the model with two levels of flattening.")
model NestedFlattenModel {
  name: string;

  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing backcompat"
  @global.Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: ChildFlattenModel;
}

@doc("This is the child model to be flattened.")
model ChildModel {
  description: string;
  age: int32;
}

@doc("This is the child model to be flattened. And it has flattened property as well.")
model ChildFlattenModel {
  summary: string;

  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing backcompat"
  @global.Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: ChildModel;
}

@scenario
@route("/flattenModel")
@scenarioDoc("""
  Update and receive model with 1 level of flattening.
  Expected input body:
  ```json
  {
    "name": "foo",
    "properties": {
      "description": "bar",
      "age": 10
    }
  }
  ```
  
  Expected response body:
  ```json
  {
    "name": "test",
    "properties": {
      "description": "test",
      "age": 1
    }
  }
  ```
  """)
@put
op putFlattenModel(@body input: FlattenModel): FlattenModel;

@scenario
@route("/nestedFlattenModel")
@scenarioDoc("""
  Update and receive model with 2 levels of flattening.
  Expected input body:
  ```json
  {
    "name": "foo",
    "properties": {
      "summary": "bar",
      "properties": {
        "description": "test",
        "age": 10
      }
    }
  }
  ```
  
  Expected response body:
  ```json
  {
    "name": "test",
    "properties": {
      "summary": "test",
      "properties": {
        "description": "foo",
        "age": 1
      }
    }
  }
  ```
  """)
@put
op putNestedFlattenModel(@body input: NestedFlattenModel): NestedFlattenModel;

@doc("This is the model with unknown type properties to be flattened.")
model FlattenUnknownModel {
  name: string;

  #suppress "@azure-tools/typespec-azure-core/no-unknown" "For testing purposes"
  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing backcompat"
  @global.Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties?: unknown;
}

@scenario
@route("/flattenUnknownModel")
@scenarioDoc("""
  Update and receive model with flatten property of unknown type.
  Expected input body:
  ```json
  {
    "name": "foo"
  }
  ```
  
  Expected response body:
  ```json
  {
    "name": "test",
    "properties": {
      "key1": "value1",
      "key2": "value2"
    }
  }
  ```
  """)
@put
op putFlattenUnknownModel(@body input: FlattenUnknownModel): FlattenUnknownModel;

@doc("This is the model with all read-only properties to be flattened.")
model SolutionProperties {
  @visibility(Lifecycle.Read)
  solutionId?: string;

  @visibility(Lifecycle.Read)
  title?: string;

  @visibility(Lifecycle.Read)
  content?: string;
}

@doc("This is the model with flattened properties that are all read-only.")
model Solution {
  name: string;

  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing backcompat"
  @global.Azure.ClientGenerator.Core.Legacy.flattenProperty
  properties: SolutionProperties;

  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing backcompat"
  @global.Azure.ClientGenerator.Core.Legacy.flattenProperty
  propertiesOptional?: SolutionProperties;
}

@scenario
@route("/flattenReadOnlyModel")
@scenarioDoc("""
  Test model with flatten property containing all read-only properties.
  Expected input body:
  ```json
  {
    "name": "foo",
    "properties": {},
    "propertiesOptional": {}
  }
  ```
  
  Expected response body:
  ```json
  {
    "name": "test",
    "properties": {
      "solutionId": "solution1",
      "title": "Solution Title",
      "content": "Solution Content"
    }
  }
  ```
  """)
@put
op putFlattenReadOnlyModel(@body body: Solution): Solution;

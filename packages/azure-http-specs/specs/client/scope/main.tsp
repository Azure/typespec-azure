import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Azure.ClientGenerator.Core;
using Spector;

/**
 * Describe scoping operations to specific languages with `@scope`
 */
@scenarioService("/client/scope")
namespace Client.Scope;

model Item {
  name: string;
  value: int32;
}

@scenario
@scenarioDoc("""
  Testing that operations scoped to all languages are generated.
  The `list` operation has no `@scope` decorator and should be generated for all languages.
  
  Expected response body:
  ```json
  [{"name": "item1", "value": 1}]
  ```
  """)
@route("/all")
@get
op list(): Item[];

@scenario
@scenarioDoc("""
  Testing that operations scoped to specific languages are only generated for those languages.
  The `create` operation is scoped to `python` and `java` only.
  SDKs for other languages (C#, TypeScript, Go) should NOT generate this operation.
  
  Expected request body:
  ```json
  {"name": "item1", "value": 1}
  ```
  Expected response body:
  ```json
  {"name": "item1", "value": 1}
  ```
  """)
@scope("python, java")
@route("/scoped")
@post
op create(@body body: Item): Item;

import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for @nextLinkVerb decorator.")
@scenarioService("/azure/client-generator-core/next-link-verb")
@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.nextlinkverb",
  "java"
)
namespace _Specs_.Azure.ClientGenerator.Core.NextLinkVerb;

@doc("Test model.")
model Test {
  @doc("The id of the test.")
  id: string;
}

@doc("Paged response model.")
model ListTestResult {
  @pageItems
  @doc("List of tests.")
  tests: Test[];

  @nextLink
  @doc("Link to fetch more tests.")
  next?: string;
}

@scenario
@scenarioDoc("""
  Test for @nextLinkVerb decorator with POST verb.
  This operation should use POST for both the initial request and the next link request.
  
  Expected initial request: POST /azure/client-generator-core/next-link-verb/items
  Expected response body:
  ```json
  {
    "tests": [
      {
        "id": "test1"
      }
    ],
    "next": "http://localhost:3000/azure/client-generator-core/next-link-verb/items/page/2"
  }
  ```
  
  Expected next link request: POST /azure/client-generator-core/next-link-verb/items/page/2
  Expected response body:
  ```json
  {
    "tests": [
      {
        "id": "test2"
      }
    ]
  }
  ```
  """)
@global.Azure.ClientGenerator.Core.Legacy.nextLinkVerb("POST")
@list
@route("/items")
@post
op listItems(): ListTestResult;

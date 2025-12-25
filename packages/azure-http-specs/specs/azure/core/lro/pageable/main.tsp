import "@azure-tools/typespec-azure-core";
import "@typespec/spector";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-client-generator-core";

using Azure.Core;
using global.Azure.Core.Traits;
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Spector;

#suppress "@azure-tools/typespec-azure-core/casing-style" "For spec"
@doc("Illustrates bodies templated with Azure Core with long-running operation that returns a pageable list")
@scenarioService(
  "/azure/core/lro/pageable",
  {
    versioned: Versions,
  }
)
@global.Azure.ClientGenerator.Core.clientNamespace("azure.core.lro.pageable", "java")
namespace _Specs_.Azure.Core.Lro.Pageable;

@doc("The API version.")
enum Versions {
  @doc("The 2022-12-01-preview version.")
  v2022_12_01_preview: "2022-12-01-preview",
}

@resource("users")
@doc("Details about a user.")
model User {
  @key
  @visibility(Lifecycle.Read)
  @doc("The name of user.")
  name: string;

  @doc("The role of user")
  role: string;
}

@doc("The status result of exporting users.")
model ExportUsersStatus is global.Azure.Core.Foundations.OperationStatus<global.Azure.Core.Page<User>>;

@scenario
@doc("Export users")
@summary("Exports a list of users.")
@scenarioDoc("""
  This scenario tests a long-running operation that returns a pageable list of users.
  The interaction process is: first complete the LRO, then iterate through the paged results.
  
  Expected verb: GET
  Expected path parameter: name=user1
  Expected query parameter: api-version=2022-12-01-preview&format=json
  
  Expected status code: 202
  Expected response header: operation-location={endpoint}/users/user1/operations/operation1
  Expected response body:
  ```json
  {
    "id": "operation1",
    "status": "InProgress"
  }
  ```
  
  Expected verb: GET
  Expected URL: {endpoint}/users/user1/operations/operation1
  Expected query parameter: api-version=2022-12-01-preview
  
  Expected status code: 200
  Expected response body:
  ```json
  {
    "id": "operation1",
    "status": "InProgress"
  }
  ```
  
  Expected verb: GET
  Expected URL: {endpoint}/users/user1/operations/operation1
  Expected query parameter: api-version=2022-12-01-preview
  
  Expected status code: 200
  Expected response body:
  ```json
  {
    "id": "operation1",
    "status": "Succeeded",
    "result": {
      "value": [
        {
          "name": "user1",
          "role": "reader"
        },
        {
          "name": "user2",
          "role": "contributor"
        }
      ],
      "nextLink": "{endpoint}/users/user1/operations/operation1?page=2&api-version=2022-12-01-preview"
    }
  }
  ```
  
  Expected verb: GET
  Expected URL: {endpoint}/users/user1/operations/operation1?page=2
  Expected query parameter: api-version=2022-12-01-preview
  
  Expected status code: 200
  Expected response body:
  ```json
  {
    "id": "operation1",
    "status": "Succeeded",
    "result": {
      "value": [
        {
          "name": "user3",
          "role": "owner"
        }
      ]
    }
  }
  ```
  """)
#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a custom LRO operation for testing"
@route("/users/{name}:export")
@get
op export(
  @path name: string,
  @query format: string,
): AcceptedResponse &
  global.Azure.Core.ResourceOperationStatus<User, ExportUsersStatus, global.Azure.Core.Foundations.Error> &
  global.Azure.Core.Foundations.LongRunningStatusLocation<ExportUsersStatus>;

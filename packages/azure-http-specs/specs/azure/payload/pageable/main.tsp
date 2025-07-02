import "@typespec/spector";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";

using Spector;
using Versioning;
using global.Azure.Core;
using global.Azure.ClientGenerator.Core;

@doc("Test describing pageable.")
@scenarioService("/azure/payload/pageable")
@useDependency(global.Azure.Core.Versions.v1_0_Preview_2)
@versioned(ApiVersions)
namespace _Specs_.Azure.Payload.Pageable;

@doc("API Versions")
enum ApiVersions {
  @doc("Version 1")
  v1: "v1",
  
  @doc("Version 2") 
  v2: "v2",
}

@@clientNamespace(_Specs_.Azure.Payload.Pageable, "azure.payload.pageable", "java");

@doc("User model")
model User {
  @doc("User name")
  name: string;
}

interface ApiVersionUpdate {
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "For testing pageable"
  @scenario
  @scenarioDoc("""
    Test pageable operation where nextLink has api-version v1 but the service requires v2.
    
    First call: GET /azure/payload/pageable/api-version-update-nextlink-v1
    Expected query parameter: maxpagesize=3
    Expected response body:
    ```json
    {
      "value": [
        {"name": "user1"},
        {"name": "user2"}, 
        {"name": "user3"}
      ],
      "nextLink": "{endpoint}/azure/payload/pageable/api-version-update-nextlink-v1?skipToken=token-user3&maxpagesize=3&api-version=v1"
    }
    ```
    
    Second call: Should call nextLink but with api-version=v2 instead of v1
    GET /azure/payload/pageable/api-version-update-nextlink-v1?skipToken=token-user3&maxpagesize=3&api-version=v2
    Expected response body:
    ```json
    {
      "value": [
        {"name": "user4"}
      ]
    }
    ```
    
    If api-version=v1 is used in the second call, the mockapi should return an error saying that APIVersion should have been updated to v2.
    """)
  @doc("Test pageable with nextLink having api-version v1 but expecting v2")
  @route("/api-version-update-nextlink-v1")
  @get
  listWithApiVersionUpdateV1(...MaxPageSizeQueryParameter): Page<User>;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "For testing pageable"
  @scenario
  @scenarioDoc("""
    Test pageable operation where nextLink has no api-version but the service requires v2.
    
    First call: GET /azure/payload/pageable/api-version-update-nextlink-missing
    Expected query parameter: maxpagesize=3
    Expected response body:
    ```json
    {
      "value": [
        {"name": "user1"},
        {"name": "user2"}, 
        {"name": "user3"}
      ],
      "nextLink": "{endpoint}/azure/payload/pageable/api-version-update-nextlink-missing?skipToken=token-user3&maxpagesize=3"
    }
    ```
    
    Second call: Should call nextLink but with api-version=v2 added
    GET /azure/payload/pageable/api-version-update-nextlink-missing?skipToken=token-user3&maxpagesize=3&api-version=v2
    Expected response body:
    ```json
    {
      "value": [
        {"name": "user4"}
      ]
    }
    ```
    
    If no api-version is provided in the second call, the mockapi should return an error saying that APIVersion should have been added.
    """)
  @doc("Test pageable with nextLink missing api-version but expecting v2")
  @route("/api-version-update-nextlink-missing")
  @get
  listWithApiVersionUpdateMissing(...MaxPageSizeQueryParameter): Page<User>;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "For testing pageable"
@scenario
@scenarioDoc("""
  List users.
  
  SDK may hide the "maxpagesize" from API signature. The functionality of "maxpagesize" could be in related language Page model.
  
  Expected query parameter:
  maxpagesize=3
  
  Expected response body:
  ```json
  {
    "value":[
      {
        "name":"user5"
      },
      {
        "name":"user6"
      },
      {
        "name":"user7"
      }
    ],
    "nextLink": "{endpoint}/azure/payload/pageable?skipToken=name-user7&maxpagesize=3"
  }
  ```
  
  Expected query parameter:
  skipToken=name-user7
  maxpagesize=3
  
  ```json
  {
    "value":[
      {
        "name":"user8"
      }
    ]
  }
  ```
  """)
@doc("List users")
op list(...MaxPageSizeQueryParameter): Page<User>;

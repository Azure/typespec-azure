import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for client initialization decorator - moving parameters from method to client level")
@scenarioService("/azure/client-generator-core/client-initialization/individually-parent")
namespace _Specs_.Azure.ClientGenerator.Core.ClientInitialization.IndividuallyParentClient;

@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.clientinitialization.individuallyparentclient",
  "java"
)
model PathParamClientOptions {
  @doc("The blob name to use for operations")
  blobName: string;
}

model DefaultQueryParamClientOptions {
  @doc("The blob name to use for operations")
  blobName: string;
}

model HeaderParamClientOptions {
  @doc("The name to use for operations")
  name: string;
}

model MultipleParamsClientOptions {
  @doc("The name to use for operations")
  name: string;

  @doc("The region to use for operations")
  region: string;
}

model MixedParamsClientOptions {
  @doc("The name to use for operations")
  name: string;
}

model ParamAliasClientOptions {
  @doc("Blob name for the client.")
  @global.Azure.ClientGenerator.Core.paramAlias("blob")
  blobName: string;
}

// Common parameter types and models

model NameHeaderParam {
  @header("name")
  name: string;
}

model RegionQueryParam {
  @query
  region: string;
}

model DefaultQueryParam {
  @query
  blobName: string;
}

// Nested layer services for first-layer default (no decorator)
// Scenario 1: Default -> Individually and Parent initialization with path parameter
@scenarioDoc("""
  Client for testing default -> individually and parent nested initialization.
  
  The parent client uses default initialization behavior,
  and the child client uses both individually and parent initialization behavior.
  
  Parameters elevated to client level:
  - blobName: "test-resource" (path parameter)
  
  Expected client usage:
  ```ts
  // via IndividuallyParentClient (parent initialization)
  const client = IndividuallyParentClient.getIndividuallyParentNestedWithPathClient({
    blobName: "test-resource"
  });
  
  // directly (individually initialized)
  const client = new IndividuallyParentNestedWithPathClient({
    blobName: "test-resource"
  });
  
  // Operations don't need blobName parameter
  client.withQuery(format: "text");
  client.getStandalone();
  client.deleteStandalone();
  ```
  """)
@scenario
@doc("Operations for nested default -> individually and parent")
@global.Azure.ClientGenerator.Core.operationGroup
@global.Azure.ClientGenerator.Core.clientInitialization({
  parameters: PathParamClientOptions,
  initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually | global.Azure.ClientGenerator.Core.InitializedBy.parent,
})
@route("/nested-default-individually-parent")
interface IndividuallyParentNestedWithPathClient {
  @route("/{blobName}/with-query")
  @get
  withQuery(@path blobName: string, @query format?: string): void;

  @route("/{blobName}/get-standalone")
  @get
  getStandalone(@path blobName: string): BlobProperties;

  @route("/{blobName}")
  @delete
  deleteStandalone(@path blobName: string): void;
}

// Nested layer services for first-layer default (no decorator) - Query variant
// Scenario 2: Default -> Individually and Parent initialization with query parameter
@scenarioDoc("""
  Client for testing default -> individually and parent nested initialization.
  
  The parent client uses default initialization behavior,
  and the child client uses both individually and parent initialization behavior.
  
  Parameters elevated to client level:
  - blobName: "test-blob" (query parameter)
  
  Expected client usage:
  ```ts
  // via IndividuallyParentClient (parent initialization)
  const client = IndividuallyParentClient.getIndividuallyParentNestedWithQueryClient({
    blobName: "test-blob"
  });
  
  // directly (individually initialized)
  const client = new IndividuallyParentNestedWithQueryClient({
    blobName: "test-blob"
  });
  
  // Operations don't need blobName parameter
  client.withQuery(format: "text");
  client.getStandalone();
  client.deleteStandalone();
  ```
  """)
@scenario
@doc("Operations for nested default -> individually and parent with query parameters")
@global.Azure.ClientGenerator.Core.operationGroup
@global.Azure.ClientGenerator.Core.clientInitialization({
  parameters: DefaultQueryParamClientOptions,
  initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually | global.Azure.ClientGenerator.Core.InitializedBy.parent,
})
@route("/nested-default-individually-parent-query")
interface IndividuallyParentNestedWithQueryClient {
  @route("/with-query")
  @get
  withQuery(...DefaultQueryParam, @query format?: string): void;

  @route("/get-standalone")
  @get
  getStandalone(...DefaultQueryParam): BlobProperties;

  @route("/delete-resource")
  @delete
  deleteStandalone(...DefaultQueryParam): void;
}

// Nested layer services for default -> header parameters
// Scenario 3: Default -> Individually and Parent initialization with Header parameter
@scenarioDoc("""
  Client for testing default -> individually and parent header parameter nested initialization.
  
  The parent client uses default initialization behavior,
  and the child client moves header parameters to client level and uses both individually and parent initialization.
  
  Parameters elevated to client level:
  - name: "test-name-value" (header parameter)
  
  Expected client usage:
  ```ts
  // via IndividuallyParentClient (parent initialization)
  const client = IndividuallyParentClient.getIndividuallyParentNestedWithHeaderClient({
    name: "test-name-value"
  });
  
  // directly (individually initialized)
  const client = new IndividuallyParentNestedWithHeaderClient({
    name: "test-name-value"
  });
  
  // Operations don't need name header parameter
  client.withQuery(format: "text");
  client.getStandalone();
  client.deleteStandalone();
  ```
  """)
@scenario
@doc("Operations for nested default -> individually and parent header parameters")
@global.Azure.ClientGenerator.Core.operationGroup
@global.Azure.ClientGenerator.Core.clientInitialization({
  parameters: HeaderParamClientOptions,
  initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually | global.Azure.ClientGenerator.Core.InitializedBy.parent,
})
@route("/nested-default-individually-parent-header")
interface IndividuallyParentNestedWithHeaderClient {
  @route("/with-query")
  @get
  withQuery(...NameHeaderParam, @query format?: string): void;

  @route("/get-standalone")
  @get
  getStandalone(...NameHeaderParam): void;

  @route("/delete-standalone")
  @delete
  deleteStandalone(...NameHeaderParam): void;
}

// Nested layer services for default -> multiple parameters
// Scenario 4: Default -> Individually and Parent Multiple parameters client
@scenarioDoc("""
  Client for testing default -> individually and parent multiple parameters nested initialization.
  
  The parent client uses default initialization behavior,
  and the child client moves multiple parameters (header and query) to client level with both individually and parent initialization.
  
  Parameters elevated to client level:
  - name: "test-name-value" (header parameter)
  - region: "us-west" (query parameter)
  
  Expected client usage:
  ```ts
  // via IndividuallyParentClient (parent initialization)
  const client = IndividuallyParentClient.getIndividuallyParentNestedWithMultipleClient({
    name: "test-name-value",
    region: "us-west"
  });
  
  // directly (individually initialized)
  const client = new IndividuallyParentNestedWithMultipleClient({
    name: "test-name-value",
    region: "us-west"
  });
  
  // Operations don't need name or region parameters
  client.withQuery(format: "text");
  client.getStandalone();
  client.deleteStandalone();
  ```
  """)
@scenario
@doc("Operations for nested default -> individually and parent multiple parameters")
@global.Azure.ClientGenerator.Core.operationGroup
@global.Azure.ClientGenerator.Core.clientInitialization({
  parameters: MultipleParamsClientOptions,
  initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually | global.Azure.ClientGenerator.Core.InitializedBy.parent,
})
@route("/nested-default-individually-parent-multiple")
interface IndividuallyParentNestedWithMultipleClient {
  @route("/with-query")
  @get
  withQuery(...NameHeaderParam, ...RegionQueryParam, @query format?: string): void;

  @route("/get-standalone")
  @get
  getStandalone(...NameHeaderParam, ...RegionQueryParam): void;

  @route("/delete-standalone")
  @delete
  deleteStandalone(...NameHeaderParam, ...RegionQueryParam): void;
}

// Nested layer services for default -> mixed parameters
// Scenario 5: Default -> Individually and Parent Mixed parameters client
@scenarioDoc("""
  Client for testing default -> individually and parent mixed parameters nested initialization.
  
  The parent client uses default initialization behavior,
  and the child client moves some parameters to client level while keeping others at method level with both individually and parent initialization.
  
  Parameters elevated to client level:
  - name: "test-name-value" (header parameter)
  
  Parameters remaining at method level:
  - region: "us-west" (query parameter)
  
  Expected client usage:
  ```ts
  // via IndividuallyParentClient (parent initialization)
  const client = IndividuallyParentClient.getIndividuallyParentNestedWithMixedClient({
    name: "test-name-value"
  });
  
  // directly (individually initialized)
  const client = new IndividuallyParentNestedWithMixedClient({
    name: "test-name-value"
  });
  
  // Operations still need region parameter
  client.withQuery(region: "us-west", format: "text");
  client.getStandalone(region: "us-west");
  client.deleteStandalone(region: "us-west");
  ```
  """)
@scenario
@doc("Operations for nested default -> individually and parent mixed parameters")
@global.Azure.ClientGenerator.Core.operationGroup
@global.Azure.ClientGenerator.Core.clientInitialization({
  parameters: MixedParamsClientOptions,
  initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually | global.Azure.ClientGenerator.Core.InitializedBy.parent,
})
@route("/nested-default-individually-parent-mixed")
interface IndividuallyParentNestedWithMixedClient {
  @route("/with-query")
  @get
  withQuery(...NameHeaderParam, ...RegionQueryParam, @query format?: string): void;

  @route("/get-standalone")
  @get
  getStandalone(...NameHeaderParam, ...RegionQueryParam): void;

  @route("/delete-standalone")
  @delete
  deleteStandalone(...NameHeaderParam, ...RegionQueryParam): void;
}

// Nested layer services for param alias
// Scenario 6: Default -> Individually and Parent parameter alias client
@scenarioDoc("""
  Client for testing default -> individually and parent parameter alias nested initialization.
  
  The parent client uses default initialization behavior,
  and the child client renames parameters at client level using @paramAlias with both individually and parent initialization.
  
  Parameters elevated to client level:
  - blobName: "test-blob" → renamed to "renamedBlobName" using @paramAlias (query parameter)
  
  Expected client usage:
  ```ts
  // via IndividuallyParentClient (parent initialization)
  const client = IndividuallyParentClient.getIndividuallyParentNestedWithParamAliasClient({
    renamedBlobName: "test-blob"  // Renamed from blobName
  });
  
  // directly (individually initialized)
  const client = new IndividuallyParentNestedWithParamAliasClient({
    renamedBlobName: "test-blob"  // Renamed from blobName
  });
  
  // Operations use blob or blobName at method level
  client.withAliasedName(blob: "test-blob-path");
  client.withOriginalName(blobName: "test-blob-path");
  ```
  """)
@scenario
@doc("Operations for nested default -> individually and parent param alias")
@global.Azure.ClientGenerator.Core.operationGroup
@global.Azure.ClientGenerator.Core.clientInitialization({
  parameters: ParamAliasClientOptions,
  initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually | global.Azure.ClientGenerator.Core.InitializedBy.parent,
})
@route("/nested-default-individually-parent-param-alias")
interface IndividuallyParentNestedWithParamAliasClient {
  @route("/{blob}/with-aliased-name")
  @get
  withAliasedName(
    @path
    blob: string,
  ): void;

  @route("/{blobName}/with-original-name")
  @get
  withOriginalName(
    @path
    blobName: string,
  ): void;
}

@doc("Properties of a blob")
model BlobProperties {
  name: string;
  size: int64;
  contentType: string;
  createdOn: utcDateTime;
}

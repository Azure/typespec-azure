import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@doc("Test for client initialization decorator - moving parameters from method to client level")
@scenarioService("/azure/client-generator-core/client-initialization/individually")
namespace _Specs_.Azure.ClientGenerator.Core.ClientInitialization.IndividuallyClient;

@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.clientinitialization.individuallyclient",
  "java"
)
model PathParamClientOptions {
  @doc("The blob name to use for operations")
  blobName: string;
}

model BlobQueryParamClientOptions {
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

model BlobQueryParam {
  @query
  blobName: string;
}

// Nested layer services for first-layer default (no decorator)
// Scenario 1: Default -> Individually initialization with path parameter
@scenarioDoc("""
  Client for testing default -> individually nested initialization.
  
  The parent client uses default initialization behavior,
  and the child client uses individually initialization behavior.
  
  Parameters elevated to client level:
  - blobName: "test-resource" (path parameter)
  
  Expected client usage:
  ```ts
  // directly (individually initialized)
  const client = new IndividuallyNestedWithPathClient({
    blobName: "test-resource"
  });
  
  // Operations don't need blobName parameter
  client.withQuery(format: "text");
  client.getStandalone();
  client.deleteStandalone();
  ```
  """)
@scenario
@doc("Operations for nested default -> individually")
@global.Azure.ClientGenerator.Core.client({
  name: "IndividuallyNestedWithPathClient",
})
@global.Azure.ClientGenerator.Core.clientInitialization({
  parameters: PathParamClientOptions,
  initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually,
})
@route("/nested-default-individually")
interface IndividuallyNestedWithPath {
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
// Scenario 2: Default -> Individually initialization with query parameter
@scenarioDoc("""
  Client for testing default -> individually nested initialization.
  
  The parent client uses default initialization behavior,
  and the child client uses individually initialization behavior.
  
  Parameters elevated to client level:
  - blobName: "test-blob" (query parameter)
  
  Expected client usage:
  ```ts
  // directly (individually initialized)
  const client = new IndividuallyNestedWithQueryClient({
    blobName: "test-blob"
  });
  
  // Operations don't need blobName parameter
  client.withQuery(format: "text");
  client.getStandalone();
  client.deleteStandalone();
  ```
  """)
@scenario
@doc("Operations for nested default -> individually with query parameters")
@global.Azure.ClientGenerator.Core.client({
  name: "IndividuallyNestedWithQueryClient",
})
@global.Azure.ClientGenerator.Core.clientInitialization({
  parameters: BlobQueryParamClientOptions,
  initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually,
})
@route("/nested-default-individually-query")
interface IndividuallyNestedWithQuery {
  @route("/with-query")
  @get
  withQuery(...BlobQueryParam, @query format?: string): void;

  @route("/get-standalone")
  @get
  getStandalone(...BlobQueryParam): BlobProperties;

  @route("/delete-resource")
  @delete
  deleteStandalone(...BlobQueryParam): void;
}

// Nested layer services for default -> header parameters
// Scenario 3: Default -> Individually initialization with Header parameter
@scenarioDoc("""
  Client for testing default -> individually header parameter nested initialization.
  
  The parent client uses default initialization behavior,
  and the child client moves header parameters to client level and uses individually initialization.
  
  Parameters elevated to client level:
  - name: "test-name-value" (header parameter)
  
  Expected client usage:
  ```ts
  // directly (individually initialized)
  const client = new IndividuallyNestedWithHeaderClient({
    name: "test-name-value"
  });
  
  // Operations don't need name header parameter
  client.withQuery(format: "text");
  client.getStandalone();
  client.deleteStandalone();
  ```
  """)
@scenario
@doc("Operations for nested default -> individually header parameters")
@global.Azure.ClientGenerator.Core.client({
  name: "IndividuallyNestedWithHeaderClient",
})
@global.Azure.ClientGenerator.Core.clientInitialization({
  parameters: HeaderParamClientOptions,
  initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually,
})
@route("/nested-default-individually-header")
interface IndividuallyNestedWithHeader {
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
// Scenario 4: Default -> Individually Multiple parameters client
@scenarioDoc("""
  Client for testing default -> individually multiple parameters nested initialization.
  
  The parent client uses default initialization behavior,
  and the child client moves multiple parameters (header and query) to client level with individually initialization.
  
  Parameters elevated to client level:
  - name: "test-name-value" (header parameter)
  - region: "us-west" (query parameter)
  
  Expected client usage:
  ```ts
  // directly (individually initialized)
  const client = new IndividuallyNestedWithMultipleClient({
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
@doc("Operations for nested default -> individually multiple parameters")
@global.Azure.ClientGenerator.Core.client({
  name: "IndividuallyNestedWithMultipleClient",
})
@global.Azure.ClientGenerator.Core.clientInitialization({
  parameters: MultipleParamsClientOptions,
  initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually,
})
@route("/nested-default-individually-multiple")
interface IndividuallyNestedWithMultiple {
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
// Scenario 5: Default -> Individually Mixed parameters client
@scenarioDoc("""
  Client for testing default -> individually mixed parameters nested initialization.
  
  The parent client uses default initialization behavior,
  and the child client moves some parameters to client level while keeping others at method level with individually initialization.
  
  Parameters elevated to client level:
  - name: "test-name-value" (header parameter)
  
  Parameters remaining at method level:
  - region: "us-west" (query parameter)
  
  Expected client usage:
  ```ts
  // directly (individually initialized)
  const client = new IndividuallyNestedWithMixedClient({
    name: "test-name-value"
  });
  
  // Operations still need region parameter
  client.withQuery(region: "us-west", format: "text");
  client.getStandalone(region: "us-west");
  client.deleteStandalone(region: "us-west");
  ```
  """)
@scenario
@doc("Operations for nested default -> individually mixed parameters")
@global.Azure.ClientGenerator.Core.client({
  name: "IndividuallyNestedWithMixedClient",
})
@global.Azure.ClientGenerator.Core.clientInitialization({
  parameters: MixedParamsClientOptions,
  initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually,
})
@route("/nested-default-individually-mixed")
interface IndividuallyNestedWithMixed {
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
// Scenario 6: Default -> Individually ParamAlias client
@scenarioDoc("""
  Client for testing default -> individually param alias nested initialization.
  
  The parent client uses default initialization behavior,
  and the child client uses individually initialization with param alias.
  
  Parameters elevated to client level:
  - blobName: "sample-blob" (path parameter with @paramAlias("blob"))
  
  Expected client usage:
  ```ts
  // directly (individually initialized)
  const client = new IndividuallyNestedWithParamAliasClient({
    blobName: "sample-blob"
  });
  
  // Operations don't need blob/blobName parameter
  client.withAliasedName();
  client.withOriginalName();
  ```
  """)
@scenario
@doc("Operations for nested default -> individually param alias")
@global.Azure.ClientGenerator.Core.client({
  name: "IndividuallyNestedWithParamAliasClient",
})
@global.Azure.ClientGenerator.Core.clientInitialization({
  parameters: ParamAliasClientOptions,
  initializedBy: global.Azure.ClientGenerator.Core.InitializedBy.individually,
})
@route("/nested-default-individually-param-alias")
interface IndividuallyNestedWithParamAlias {
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

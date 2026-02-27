import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-client-generator-core";

using Http;
using Spector;
using Azure.ClientGenerator.Core;

@global.Azure.ClientGenerator.Core.clientNamespace(
  "azure.clientgenerator.core.clientinitialization.defaultclient",
  "java"
)
@doc("Test for client initialization decorator - moving parameters from method to client level")
@scenarioService("/azure/client-generator-core/client-initialization/default")
namespace _Specs_.Azure.ClientGenerator.Core.ClientInitialization.DefaultClient;

model HeaderParamClientOptions {
  @doc("The name of the client. This parameter is used as a header in all operations.")
  name: string;
}

model MultipleParamsClientOptions {
  @doc("The name of the client. This parameter is used as a header in all operations.")
  name: string;

  @doc("The region to use for all operations. This parameter is used as a query parameter.")
  region: string;
}

model MixedParamsClientOptions {
  @doc("The name of the client. This parameter is used as a header in all operations.")
  name: string;
}

model PathParamClientOptions {
  @doc("The name of the blob. This parameter is used as a path parameter in all operations.")
  blobName: string;
}

model ParamAliasClientOptions {
  @doc("Blob name for the client.")
  @global.Azure.ClientGenerator.Core.paramAlias("blob")
  blobName: string;
}

model BlobQueryParamClientOptions {
  @doc("The blob name to use for operations")
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

model Input {
  name: string;
}

model BlobQueryParam {
  @query
  blobName: string;
}

// Scenario 1: Header parameter moved to client level
@scenarioDoc("""
  Client for testing header parameter moved to client level.
  
  Parameters elevated to client level:
  - name: "test-name-value" (header parameter)
  
  Expected client usage:
  ```ts
  const client = new HeaderParamClient({
    name: "test-name-value"
  });
  
  client.withQuery(id: "test-id");  // No need to pass name here
  client.withBody({ name: "test-name" });  // No need to pass name here
  ```
  """)
@scenario
@doc("Client for testing header parameter moved to client level.")
@global.Azure.ClientGenerator.Core.client({
  name: "HeaderParamClient",
})
@global.Azure.ClientGenerator.Core.clientInitialization(HeaderParamClientOptions)
@route("/header-param")
interface HeaderParam {
  @route("/with-query")
  @get
  withQuery(...NameHeaderParam, @query id: string): void;

  @route("/with-body")
  @post
  withBody(...NameHeaderParam, @body body: Input): void;
}

// Scenario 2: Multiple parameters (header and query) moved to client level
@scenarioDoc("""
  Client for testing multiple parameters (header and query) moved to client level.
  
  Parameters elevated to client level:
  - name: "test-name-value" (header parameter)
  - region: "us-west" (query parameter)
  
  Expected client usage:
  ```ts
  const client = new MultipleParamsClient({
    name: "test-name-value",
    region: "us-west"
  });
  
  client.withQuery(id: "test-id");  // No need to pass name or region here
  client.withBody({ name: "test-name" });  // No need to pass name or region here
  ```
  """)
@scenario
@doc("Client for testing multiple parameters (header and query) moved to client level.")
@global.Azure.ClientGenerator.Core.client({
  name: "MultipleParamsClient",
})
@global.Azure.ClientGenerator.Core.clientInitialization(MultipleParamsClientOptions)
@route("/multiple-params")
interface MultipleParams {
  @route("/with-query")
  @get
  withQuery(...NameHeaderParam, ...RegionQueryParam, @query id: string): void;

  @route("/with-body")
  @post
  withBody(...NameHeaderParam, ...RegionQueryParam, @body body: Input): void;
}

// Scenario 3: Mix of client-level and method-level parameters
@scenarioDoc("""
  Client for testing a mix of client-level and method-level parameters.
  
  Parameters elevated to client level:
  - name: "test-name-value" (header parameter)
  
  Parameters remaining at method level:
  - region: "us-west" (query parameter)
  
  Expected client usage:
  ```ts
  const client = new MixedParamsClient({
    name: "test-name-value"
  });
  
  client.withQuery(region: "us-west", id: "test-id");  // region stays as method param
  client.withBody(region: "us-west", body: { name: "test-name" });  // region stays as method param
  ```
  """)
@scenario
@doc("Client for testing a mix of client-level and method-level parameters.")
@global.Azure.ClientGenerator.Core.client({
  name: "MixedParamsClient",
})
@global.Azure.ClientGenerator.Core.clientInitialization(MixedParamsClientOptions)
@route("/mixed-params")
interface MixedParams {
  @route("/with-query")
  @get
  withQuery(...NameHeaderParam, ...RegionQueryParam, @query id: string): void;

  @route("/with-body")
  @post
  withBody(
    ...NameHeaderParam,
    ...RegionQueryParam,
    @body body: {
      name: string;
    },
  ): void;
}

// Scenario 4: Path parameter moved to client level
@scenarioDoc("""
  Client for testing a path parameter (blobName) moved to client level.
  
  Parameters elevated to client level:
  - blobName: "sample-blob" (path parameter)
  
  Expected client usage:
  ```ts
  const client = new PathParamClient({
    blobName: "sample-blob"
  });
  
  // No need to pass blobName to any operations
  client.withQuery(format: "text");  
  client.getStandalone();
  client.deleteStandalone();
  ```
  """)
@scenario
@doc("Blob operations with path parameter that should be moved to client level")
@global.Azure.ClientGenerator.Core.client({
  name: "PathParamClient",
})
@global.Azure.ClientGenerator.Core.clientInitialization(PathParamClientOptions)
@route("/path")
interface PathParam {
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

// Scenario 5: Parameter aliases for better client API names
@scenarioDoc("""
  Client for testing the @paramAlias decorator for renaming parameters in client code.
  
  Parameters elevated to client level:
  - blobName: "sample-blob" (path parameter with @paramAlias("blob"))
  
  Expected client usage:
  ```ts
  const client = new ParamAliasClient({
    blobName: "sample-blob"
  });
  
  // Operations don't need blob/blobName parameter
  client.withAliasedName();
  client.withOriginalName();
  ```
  """)
@scenario
@doc("Operations demonstrating the @paramAlias decorator for renaming parameters in client code")
@global.Azure.ClientGenerator.Core.client({
  name: "ParamAliasClient",
})
@global.Azure.ClientGenerator.Core.clientInitialization(ParamAliasClientOptions)
@route("/param-alias")
interface ParamAlias {
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

// Scenario 6: Query parameter moved to client level
@scenarioDoc("""
  Client for testing query parameter moved to client level.
  
  Parameters elevated to client level:
  - blobName: "test-blob" (query parameter)
  
  Expected client usage:
  ```ts
  const client = new QueryParamClient({
    blobName: "test-blob"
  });
  
  // Operations don't need blobName parameter
  client.withQuery(format: "text");
  client.getStandalone();
  client.deleteStandalone();
  ```
  """)
@scenario
@doc("Blob operations with query parameter that should be moved to client level")
@global.Azure.ClientGenerator.Core.client({
  name: "QueryParamClient",
})
@global.Azure.ClientGenerator.Core.clientInitialization(BlobQueryParamClientOptions)
@route("/query")
interface QueryParam {
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

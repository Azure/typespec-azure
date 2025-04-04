import "@typespec/http";
import "@typespec/spector";

using Http;
using Spector;

@doc("Test for client initialization decorator - moving parameters from method to client level")
@scenarioService("/azure/client-generator-core/client-initialization")
namespace Service;

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

model CommonHeaders {
  @header("client-name")
  clientName: string;

  @header("correlation-id")
  correlationId: string;
}

@route("/header-param")
namespace HeaderParam {
  @route("/with-query")
  @get
  op withQuery(...NameHeaderParam, @query id: string): string;

  @route("/with-body")
  @post
  op withBody(...NameHeaderParam, @body body: Input): string;
}

// Scenario 2: Multiple parameters (header and query) moved to client level

@route("/multiple-params")
namespace MultipleParams {
  @route("/with-query")
  @get
  op withQuery(...NameHeaderParam, ...RegionQueryParam, @query id: string): string;

  @route("/with-body")
  @post
  op withBody(...NameHeaderParam, ...RegionQueryParam, @body body: Input): string;
}

// Scenario 3: Mix of client-level and method-level parameters

@route("/mixed-params")
namespace MixedParams {
  @route("/with-query")
  @get
  op withQuery(...NameHeaderParam, ...RegionQueryParam, @query id: string): string;

  @route("/with-body")
  @post
  op withBody(
    ...NameHeaderParam,
    ...RegionQueryParam,
    @body body: {
      name: string;
    },
  ): string;
}

// Scenario 4: Path parameter moved to client level
@doc("Blob operations with path parameter that should be moved to client level")
@route("/path")
namespace PathParam {
  @route("/{blobName}/with-query")
  @get
  op withQuery(@path blobName: string, @query format?: string): string;

  @route("/{blobName}/get-standalone")
  @get
  op getStandalone(@path blobName: string): BlobProperties;

  @route("/{blobName}/with-body")
  @put
  op withBody(@path blobName: string, @body content: string): void;

  @route("/{blobName}")
  @delete
  op deleteStandalone(@path blobName: string): void;
}

@doc("Properties of a blob")
model BlobProperties {
  name: string;
  size: int64;
  contentType: string;
  createdOn: utcDateTime;
}

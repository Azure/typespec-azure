import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
namespace Microsoft.TestService;

model OkBody<T> {
  @statusCode statusCode: 200;
  @body body: T;
}

model CreatedBody<T> {
  @statusCode statusCode: 201;
  @body body: T;
}

@route("/widgets")
@put
op createOrUpdate(@query("api-version") apiVersion: string): OkBody<string> | CreatedBody<int32>;

@route("/metadata")
@put
op createOrUpdateMetadata(@query("api-version") apiVersion: string):
  | OkBody<{
      @encodedName("application/json", "currentValue")
      value: string;
    }>
  | CreatedBody<{
      @encodedName("application/json", "createdValue")
      value: string;
    }>;

@route("/defaults")
@put
op createOrUpdateDefaults(@query("api-version") apiVersion: string):
  | OkBody<{
      value: string = "current";
    }>
  | CreatedBody<{
      value: string = "created";
    }>;

model BinaryOk {
  @statusCode statusCode: 200;
  @header contentType: "application/octet-stream";
  @body body: bytes;
}

model JsonBytesCreated {
  @statusCode statusCode: 201;
  @header contentType: "application/json";
  @body body: bytes;
}

@route("/bytes-content-type")
@put
op createOrUpdateBytes(@query("api-version") apiVersion: string): BinaryOk | JsonBytesCreated;

model JsonBytesOk {
  @statusCode statusCode: 200;
  @header contentType: "application/json";
  @body body: bytes;
}

model BinaryCreated {
  @statusCode statusCode: 201;
  @header contentType: "application/octet-stream";
  @body body: bytes;
}

@route("/bytes-multiple-content-types")
@put
op createOrUpdateBytesMultipleContentTypes(@query("api-version") apiVersion: string):
  | BinaryOk
  | JsonBytesOk
  | BinaryCreated;

@minItems(1)
model ConstrainedUnknownArray is Array<unknown>;

@route("/constrained-array")
@put
op createOrUpdateConstrainedArray(@query("api-version") apiVersion: string):
  | OkBody<[string]>
  | CreatedBody<ConstrainedUnknownArray>;

namespace Custom {
  scalar string extends TypeSpec.string;
}

@route("/custom-string")
@put
op createOrUpdateCustomString(@query("api-version") apiVersion: TypeSpec.string):
  | OkBody<TypeSpec.string>
  | CreatedBody<Custom.string>;

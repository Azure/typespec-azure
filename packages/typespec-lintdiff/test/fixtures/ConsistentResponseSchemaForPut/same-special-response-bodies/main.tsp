import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
namespace Microsoft.TestService;

model BinaryOk {
  @statusCode statusCode: 200;
  @header contentType: "application/octet-stream";
  @body body: bytes;
}

model BinaryCreated {
  @statusCode statusCode: 201;
  @header contentType: "application/octet-stream";
  @body body: bytes;
}

model FormData {
  value: HttpPart<string>;
}

model OtherFormData {
  count: HttpPart<int32>;
}

model MultipartOk {
  @statusCode statusCode: 200;
  @multipartBody body: FormData;
}

model MultipartCreated {
  @statusCode statusCode: 201;
  @multipartBody body: OtherFormData;
}

@route("/binary")
@put
op binaryBody(@query("api-version") apiVersion: string): BinaryOk | BinaryCreated;

@route("/multipart")
@put
op multipartBody(@query("api-version") apiVersion: string): MultipartOk | MultipartCreated;

model TupleOk {
  @statusCode statusCode: 200;
  @body body: [string];
}

model TupleCreated {
  @statusCode statusCode: 201;
  @body body: [int32, boolean];
}

@route("/tuple")
@put
op tupleBody(@query("api-version") apiVersion: string): TupleOk | TupleCreated;

model StringCreated {
  @statusCode statusCode: 201;
  @body body: string;
}

@route("/multipart-string")
@put
op multipartAndString(@query("api-version") apiVersion: string): MultipartOk | StringCreated;

model UnknownArrayCreated {
  @statusCode statusCode: 201;
  @body body: unknown[];
}

@route("/tuple-unknown-array")
@put
op tupleAndUnknownArray(@query("api-version") apiVersion: string): TupleOk | UnknownArrayCreated;

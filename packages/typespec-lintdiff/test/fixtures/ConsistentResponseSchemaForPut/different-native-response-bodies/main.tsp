import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
namespace Microsoft.TestService;

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

model TupleOk {
  @statusCode statusCode: 200;
  @body body: [string];
}

model TupleCreated {
  @statusCode statusCode: 201;
  @body body: [int32, boolean];
}

model StringCreated {
  @statusCode statusCode: 201;
  @body body: string;
}

model UnknownArrayCreated {
  @statusCode statusCode: 201;
  @body body: unknown[];
}

@route("/multipart")
@put
op multipartBody(@query("api-version") apiVersion: string): MultipartOk | MultipartCreated;

@route("/tuple")
@put
op tupleBody(@query("api-version") apiVersion: string): TupleOk | TupleCreated;

@route("/multipart-string")
@put
op multipartAndString(@query("api-version") apiVersion: string): MultipartOk | StringCreated;

@route("/tuple-unknown-array")
@put
op tupleAndUnknownArray(@query("api-version") apiVersion: string): TupleOk | UnknownArrayCreated;

import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
namespace Microsoft.TestService;

model Response<Status extends int32, Body, ContentType extends string> {
  @statusCode statusCode: Status;
  @header contentType: ContentType;
  @body body: Body;
}

model Payload {
  value: string;
}

model Other {
  value: int32;
}

model OkJson is Response<200, Payload, "application/json">;
model OkXml is Response<200, Payload, "application/xml">;
model CreatedOther is Response<201, Other, "application/json">;

@route("/json-first")
@put
op jsonFirst(@query("api-version") apiVersion: string): OkJson | OkXml | CreatedOther;

@route("/xml-first")
@put
op xmlFirst(@query("api-version") apiVersion: string): OkXml | OkJson | CreatedOther;

model OkBinary is Response<200, bytes, "application/octet-stream">;
model CreatedJson is Response<201, bytes, "application/json">;
model CreatedBinary is Response<201, bytes, "application/octet-stream">;

@route("/created-json-first")
@put
op createdJsonFirst(@query("api-version") apiVersion: string):
  | OkBinary
  | CreatedJson
  | CreatedBinary;

@route("/created-binary-first")
@put
op createdBinaryFirst(@query("api-version") apiVersion: string):
  | OkBinary
  | CreatedBinary
  | CreatedJson;

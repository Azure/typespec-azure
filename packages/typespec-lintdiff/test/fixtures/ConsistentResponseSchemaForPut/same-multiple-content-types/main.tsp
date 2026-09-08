import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
namespace Microsoft.TestService;

model Payload {
  value: string;
}

model OkJson {
  @statusCode statusCode: 200;
  @header contentType: "application/json";
  @body body: Payload;
}

model OkXml {
  @statusCode statusCode: 200;
  @header contentType: "application/xml";
  @body body: Payload;
}

model CreatedJson {
  @statusCode statusCode: 201;
  @header contentType: "application/json";
  @body body: Payload;
}

model CreatedXml {
  @statusCode statusCode: 201;
  @header contentType: "application/xml";
  @body body: Payload;
}

@route("/widgets")
@put
op createOrUpdate(@query("api-version") apiVersion: string):
  | OkJson
  | OkXml
  | CreatedJson
  | CreatedXml;

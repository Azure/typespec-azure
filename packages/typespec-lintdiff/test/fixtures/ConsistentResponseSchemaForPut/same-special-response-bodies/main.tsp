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

model JsonBytesCreated {
  @statusCode statusCode: 201;
  @header contentType: "application/json";
  @body body: bytes;
}

@route("/binary")
@put
op binaryBody(@query("api-version") apiVersion: string): BinaryOk | BinaryCreated;

@route("/binary-json")
@put
op binaryAndJsonBody(@query("api-version") apiVersion: string): BinaryOk | JsonBytesCreated;

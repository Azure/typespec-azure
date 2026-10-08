import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
namespace Microsoft.TestService;

model OkWithoutBody {
  @statusCode statusCode: 200;
}

model CreatedWithoutBody {
  @statusCode statusCode: 201;
}

model OkWithBody {
  @statusCode statusCode: 200;
  @body body: string;
}

model CreatedWithBody {
  @statusCode statusCode: 201;
  @body body: string;
}

@route("/missing-200-body")
@put
op missing200Body(@query("api-version") apiVersion: string): OkWithoutBody | CreatedWithBody;

@route("/missing-201-body")
@put
op missing201Body(@query("api-version") apiVersion: string): OkWithBody | CreatedWithoutBody;

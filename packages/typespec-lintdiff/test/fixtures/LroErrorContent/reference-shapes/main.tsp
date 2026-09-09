import "../../lib/imports.tsp";
import "@azure-tools/typespec-client-generator-core";
using TypeSpec.Http;
using TypeSpec.OpenAPI;
using Azure.ResourceManager;

@armProviderNamespace
@service
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.ReferenceShapes;

model ErrorBody {
  code: string;
}
model DerivedError extends CommonTypes.ErrorResponse {
  extra?: string;
}
model CopiedError is CommonTypes.ErrorResponse;
model SpreadError {
  ...CommonTypes.ErrorResponse;
  extra?: string;
}
scalar CustomScalar extends string;
enum ErrorEnum {
  bad,
}
union ErrorUnion {
  bad: "bad",
  worse: "worse",
}
model NamedArray is string[];
model NamedRecord is Record<string>;
model Generic<T> {
  value: T;
}
@friendlyName("FriendlyError")
model Friendly<T> {
  value: T;
}

model Failure<T> {
  @statusCode statusCode: 400;
  @body body: T;
}
@extension("x-ms-long-running-operation", true)
@post
op Lro<T>(@path name: string): AcceptedResponse | Failure<T>;

@route("/models/{name}")
op models is Lro<ErrorBody>;
@route("/derived/{name}")
op derived is Lro<DerivedError>;
@route("/spreads/{name}")
op spreads is Lro<SpreadError>;
@route("/scalar/{name}")
op scalarError is Lro<CustomScalar>;
@route("/enum/{name}")
op enumError is Lro<ErrorEnum>;
@route("/union/{name}")
op unionError is Lro<ErrorUnion>;
@route("/array/{name}")
op arrayError is Lro<NamedArray>;
@route("/record/{name}")
op recordError is Lro<NamedRecord>;
@route("/friendly/{name}")
op friendly is Lro<Friendly<string>>;
@route("/nullable/{name}")
op nullable is Lro<ErrorBody | null>;
@route("/spread-effective/{name}")
op effective is Lro<{
  ...ErrorBody;
}>;

namespace Nested {
  @route("/nested/{name}")
  op nested is Lro<ErrorBody>;
}

@Azure.ClientGenerator.Core.scope("csharp")
@route("/sdk-only/{name}")
op sdkOnly is Lro<ErrorBody>;

import "../../lib/imports.tsp";
using TypeSpec.Http;
using TypeSpec.OpenAPI;
using Azure.ResourceManager;

@armProviderNamespace
@service
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.InlineShapes;

model CopiedError is CommonTypes.ErrorResponse;
model Generic<T> {
  value: T;
}
model Failure<T> {
  @statusCode statusCode: 500;
  @body body: T;
}
@extension("x-ms-long-running-operation", true)
@post
op Lro<T>(@path name: string): AcceptedResponse | Failure<T>;

@route("/standard/{name}")
op standard is Lro<CommonTypes.ErrorResponse>;
@route("/copied/{name}")
op copied is Lro<CopiedError>;
@route("/nullable-standard/{name}")
op nullableStandard is Lro<CommonTypes.ErrorResponse | null>;
@route("/anonymous/{name}")
op anonymous is Lro<{
  anonymousCode: string;
}>;
@route("/array/{name}")
op arrayBody is Lro<string[]>;
@route("/record/{name}")
op recordBody is Lro<Record<string>>;
@route("/generic/{name}")
op generic is Lro<Generic<string>>;
@route("/scalar/{name}")
op scalarBody is Lro<string>;
@route("/literal/{name}")
op literalBody is Lro<"bad">;
@route("/number/{name}")
op numberBody is Lro<42>;
@route("/boolean/{name}")
op booleanBody is Lro<false>;
@route("/template/{name}")
op templateBody is Lro<"error-${"bad"}">;
@route("/enum-member/{name}")
op enumMember is Lro<Codes.bad>;
enum Codes {
  bad,
}
@route("/tuple/{name}")
op tupleBody is Lro<[string, int32]>;
@route("/union/{name}")
op unionBody is Lro<"bad" | "worse">;
@route("/unknown/{name}")
op unknownBody is Lro<unknown>;
@route("/bytes/{name}")
op bytesBody is Lro<bytes>;
@route("/no-body")
@extension("x-ms-long-running-operation", true)
@post
op noBody():
  | AcceptedResponse
  | {
      @statusCode statusCode: 400;
    };
@route("/binary")
@extension("x-ms-long-running-operation", true)
@post
op binary():
  | AcceptedResponse
  | {
      @statusCode statusCode: 500;
      @header contentType: "application/octet-stream";
      @body body: bytes;
    };
@route("/sync")
@post
op sync(): {
  @statusCode statusCode: 400;
  @body body: GenericError;
};
@route("/disabled/{name}")
@extension("x-ms-long-running-operation", false)
op disabled is Lro<GenericError>;
model GenericError {
  code: string;
}

@route("/file")
@extension("x-ms-long-running-operation", true)
@post
op fileBody():
  | AcceptedResponse
  | {
      @statusCode statusCode: 500;
      @body body: File;
    };
@route("/multipart")
@extension("x-ms-long-running-operation", true)
@post
op multipartBody():
  | AcceptedResponse
  | {
      @statusCode statusCode: 500;
      @multipartBody body: {
        part: HttpPart<string>;
      };
    };

@route("/success/{name}")
@extension("x-ms-long-running-operation", true)
@post
op success(@path name: string):
  | {
      @statusCode statusCode: 200;
      @body body: GenericError;
    }
  | AcceptedResponse;

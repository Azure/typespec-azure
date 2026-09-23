import "@typespec/http";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;

@service
namespace TestService;

alias Result = {
  @statusCode status: 200 | 201;
  @header etag: string;
  value: string;
};

@get
@route("/first")
op first(): Result;

@get
@route("/second")
op second(): Result;

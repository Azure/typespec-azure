import "@typespec/http";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;

@service
namespace TestService;

@get
@route("/widgets")
op read(): {
  @statusCode status: 200;
  @header etag: string;
  value: string;
};

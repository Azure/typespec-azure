import "@typespec/http";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;

@service
namespace TestService;

model Fields {
  @header etag: string;
  @statusCode status: 200;
  value: string;
}

@get
@route("/widgets")
op read(): {
  ...Fields;
};

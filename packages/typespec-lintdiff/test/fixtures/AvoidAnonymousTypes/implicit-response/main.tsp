import "@typespec/http";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;

@service
namespace TestService;

@get
@route("/widgets")
op read(): {
  value: string;
};

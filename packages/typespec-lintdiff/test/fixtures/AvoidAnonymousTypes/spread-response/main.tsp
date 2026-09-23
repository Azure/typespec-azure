import "@typespec/http";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;

@service
namespace TestService;

model Fields {
  value: string;
}

@get
@route("/widgets")
op read(): {
  ...Fields;
};

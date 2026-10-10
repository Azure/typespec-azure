import "@typespec/http";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;

@service(#{ title: "Test Service" })
namespace TestService;

model Widget {
  @encodedName("application/json", "wire-name")
  @doc(" Wire-Name. ")
  sourceName: string;
}

@route("/widgets")
@doc("Read the widget.")
@get
op read(): Widget;

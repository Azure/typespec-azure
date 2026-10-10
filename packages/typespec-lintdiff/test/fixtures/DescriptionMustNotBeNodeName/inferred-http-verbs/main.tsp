import "@typespec/http";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;

@service(#{ title: "Test Service" })
namespace TestService;

model Widget {
  @doc("The widget display name.")
  name: string;
}

@route("/widgets")
@doc(" GET. ")
op read(): string;

@route("/widgets")
@doc("post")
op create(@body body: Widget): Widget;

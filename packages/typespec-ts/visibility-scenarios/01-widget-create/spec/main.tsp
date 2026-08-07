import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

@service(#{ title: "Widget Service" })
@server("{endpoint}", "Widget service endpoint.", {
  endpoint: url,
})
namespace WidgetService;

@doc("A widget.")
model Widget {
  @doc("Server-assigned identifier.")
  @visibility(Lifecycle.Read)
  id: string;

  @doc("Server-assigned name.")
  @visibility(Lifecycle.Read)
  name: string;

  @doc("Display name (writable).")
  displayName: string;

  @doc("Weight (writable).")
  weight: int32;
}

@doc("Create a widget. The POST body is projected to the Create visibility.")
@route("/widgets")
@post
op createWidget(@body body: Widget): Widget;

@doc("A gadget with no read-only properties.")
model Gadget {
  @doc("Display name (writable).")
  displayName: string;

  @doc("Weight (writable).")
  weight: int32;
}

@doc("Create a gadget. With no read-only props the write view collapses to the same model, so request and response share it.")
@route("/gadgets")
@post
op createGadget(@body body: Gadget): Gadget;

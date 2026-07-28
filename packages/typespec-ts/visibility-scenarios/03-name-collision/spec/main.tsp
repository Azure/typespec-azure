import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

@service(#{ title: "Collision Service" })
@server("{endpoint}", "Collision service endpoint.", {
  endpoint: url,
})
namespace CollisionService;

@doc("A widget with required read-only props. Its POST body projects to a *synthesized* `WidgetCreate`.")
model Widget {
  @doc("Server-assigned identifier.")
  @visibility(Lifecycle.Read)
  id: string;

  @doc("Server-assigned name.")
  @visibility(Lifecycle.Read)
  name: string;

  @doc("Display name (writable).")
  displayName: string;
}

@doc("""
A model the USER already named `WidgetCreate`. It has no read-only properties,
so its own write view collapses to itself (no rename). It therefore competes for
the exact name the visibility split synthesizes for `Widget`'s create body.
""")
model WidgetCreate {
  @doc("An unrelated field.")
  foo: string;

  @doc("Another unrelated field.")
  bar: int32;
}

@doc("Create a widget. Body `Widget` -> synthesized `WidgetCreate` (collides with the user model).")
@route("/widgets")
@post
op createWidget(@body body: Widget): Widget;

@doc("An operation that uses the user-declared `WidgetCreate` as both body and response.")
@route("/others")
@post
op createOther(@body body: WidgetCreate): WidgetCreate;

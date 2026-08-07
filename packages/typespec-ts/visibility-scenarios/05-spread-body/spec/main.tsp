import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

@service(#{ title: "Spread Service" })
@server("{endpoint}", "Spread service endpoint.", {
  endpoint: url,
})
namespace SpreadService;

@doc("""
Model whose properties are spread into the operation signature. Its required
read-only `id` is a *top-level* property, so TCGC drops it when it flattens the
model into individual method parameters (request visibility is applied per
spread parameter). The generated `createWidget(displayName, weight)` already
omits `id` — a benign no-op for the pre-pass. Contrast with `Container` below,
where a *nested* read-only property still leaks.
""")
model Widget {
  @doc("Server-assigned identifier (read-only).")
  @visibility(Lifecycle.Read)
  id: string;

  @doc("Writable display name.")
  displayName: string;

  @doc("Writable weight.")
  weight: int32;
}

@doc("Create a widget with a spread body.")
@route("/widgets")
@post
op createWidget(...Widget): Widget;

@doc("""
Nested model reached through a spread body's model-typed property. It has a
required read-only `detailId`.
""")
model Detail {
  @doc("Server-assigned identifier (read-only).")
  @visibility(Lifecycle.Read)
  detailId: string;

  @doc("Writable note.")
  note: string;
}

@doc("""
Model whose properties are spread into the operation signature, including a
model-typed `detail` property. Spreading drops the top-level read-only
`containerId` (TCGC applies request visibility per spread parameter), and the
pre-pass additionally repoints the nested `detail` parameter. TCGC exposes the
spread mapping via `bodyParam.methodParameterSegments` (each segment's root is a
client-method parameter), so the pre-pass projects the model-typed `detail`
parameter to the write view and repoints BOTH the method parameter and the
matching wrapper property. The generated `createContainer(title, detail)` now
takes `detail: DetailCreate` (no read-only `detailId`) and serializes it with
`detailCreateSerializer`, and the synthesized `DetailCreate` is referenced rather
than orphaned. Inspect the generated `createContainer` signature and body
serialization to see the fix.
""")
model Container {
  @doc("Server-assigned identifier (read-only).")
  @visibility(Lifecycle.Read)
  containerId: string;

  @doc("Writable title.")
  title: string;

  @doc("Nested model carrying its own read-only property.")
  detail: Detail;
}

@doc("Create a container with a spread body that nests a model property.")
@route("/containers")
@post
op createContainer(...Container): Container;

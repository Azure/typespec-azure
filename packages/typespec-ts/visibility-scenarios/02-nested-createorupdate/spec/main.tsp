import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

@service(#{ title: "Nested Service" })
@server("{endpoint}", "Nested service endpoint.", {
  endpoint: url,
})
namespace NestedService;

@doc("Nested model B, referenced by A. Has a required read-only property.")
model B {
  @doc("Server-assigned identifier for B.")
  @visibility(Lifecycle.Read)
  bid: string;

  @doc("Label (writable).")
  label: string;
}

@doc("Model A used as a PUT body; contains a nested model B.")
model A {
  @doc("Server-assigned identifier for A.")
  @visibility(Lifecycle.Read)
  aid: string;

  @doc("Nested child model (writable).")
  child: B;
}

@doc("""
Create or update A. PUT resolves to Create|Update, so the body is projected to
ACreateOrUpdate, and the nested B is projected recursively to BCreateOrUpdate.
""")
@route("/as")
@put
op createOrUpdateA(@body body: A): A;

@doc("Nested model D, referenced by C. Has both writable and read-only properties.")
model D {
  @doc("Server-assigned identifier for D.")
  @visibility(Lifecycle.Read)
  did: string;

  @doc("Label (writable).")
  label: string;
}

@doc("Model C used as a POST body; has only writable properties but nests D (which has a read-only prop).")
model C {
  @doc("Name (writable).")
  name: string;

  @doc("Nested child model (writable).")
  child: D;
}

@doc("""
Create C. C's own properties are all writable, but its nested D has a read-only
property. This tests whether CCreate is still synthesized purely because a
nested model must change.
""")
@route("/cs")
@post
op createC(@body body: C): C;

import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

@service(#{ title: "Cyclic Service" })
@server("{endpoint}", "Cyclic service endpoint.", {
  endpoint: url,
})
namespace CyclicService;

@doc("""
Self-referential (cyclic) model used as a POST body. It has a required
read-only `nodeId` and an optional `next` pointing back to Node. The pre-pass
collects each `(model, visibility)` node before recursing, so the cyclic
back-edge (`next`) terminates instead of looping. Because it materializes every
write-clone shell before wiring any edges, the cyclic edge resolves uniformly:
`NodeCreate.next` correctly references `NodeCreate` (not `Node`) and
`nodeCreateSerializer` delegates `next` to `nodeCreateSerializer`, dropping the
read-only `nodeId` at every depth — with no separate back-patch pass. The read
view keeps full `Node` for the response deserializer.
""")
model Node {
  @doc("Server-assigned identifier (read-only).")
  @visibility(Lifecycle.Read)
  nodeId: string;

  @doc("Writable label.")
  label: string;

  @doc("Optional self-reference (creates the cycle).")
  next?: Node;
}

@doc("Create a node. POST -> Create; body projects to NodeCreate.")
@route("/nodes")
@post
op createNode(@body body: Node): Node;

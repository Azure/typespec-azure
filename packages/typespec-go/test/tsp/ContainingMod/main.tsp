import "@typespec/http";

using TypeSpec.Http;

@service(#{ title: "Containing module runtime tests" })
@server(
  "{endpoint}",
  "Fake server endpoint",
  {
    endpoint: url,
  }
)
namespace Emitter.ContainingMod;

/** a widget */
model Widget {
  id: int32;
}

/** returns a widget */
@get
@route("/widget")
op get(): Widget;

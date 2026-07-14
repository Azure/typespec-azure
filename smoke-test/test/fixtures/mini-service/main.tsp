import "@typespec/http";
import "@typespec/rest";

using Http;

@service(#{ title: "Mini Service" })
namespace MiniService;

model Widget {
  @key id: string;
  name: string;
  weight: int32;
}

@route("/widgets")
interface Widgets {
  @get list(): Widget[];
  @get get(@path id: string): Widget;
}

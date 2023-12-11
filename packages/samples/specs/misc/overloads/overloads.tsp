import "@typespec/http";
import "@typespec/rest";

@service({
  title: "TypeSpec Overloads Sample",
})
namespace TypeSpec.Samples.Overloads;

using TypeSpec.Http;

@route("/typespec/things")
namespace Things {
  @post
  op postThing(@body thing: Thing): Thing;

  @route("?overload=withParam")
  @post
  op postThingWithParam(
    @body body: {
      thing: Thing;
      param: string;
    },
  ): Thing;

  @route("?overload=returnString")
  @post
  op postThingReturnString(@body thing: Thing): ThingStringResponse;
}

model Thing {
  name: string;
}

model ThingStringResponse {
  @header
  contentType: "text/plain; charset=utf=8";

  ...Body<string>;
}

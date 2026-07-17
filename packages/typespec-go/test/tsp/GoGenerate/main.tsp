import "@typespec/http";

using TypeSpec.Http;

@service(#{ title: "Post-generation transform" })
namespace GoGenerate;

model Widget {
  /** the widget's name */
  name: string;
}

/** returns a widget */
@get
op get(): Widget;

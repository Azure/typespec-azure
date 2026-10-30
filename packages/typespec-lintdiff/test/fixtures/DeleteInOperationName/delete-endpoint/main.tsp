import "@typespec/http";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;

@service
namespace Test {
  interface Widgets {
    @delete
    @route("/widgets/{id}")
    deleteWidget(@path id: string): void;
  }
}

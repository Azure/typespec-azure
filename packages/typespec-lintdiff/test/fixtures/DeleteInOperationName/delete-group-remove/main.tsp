import "@typespec/http";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;

@service
namespace Test {
  interface DeleteWidgets {
    @delete
    @route("/widgets")
    remove(): void;
  }
}

import "@typespec/http";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@service
namespace Test {
  interface Widgets {
    @clientName("delete")
    @delete
    @route("/widgets")
    remove(): void;
  }
}

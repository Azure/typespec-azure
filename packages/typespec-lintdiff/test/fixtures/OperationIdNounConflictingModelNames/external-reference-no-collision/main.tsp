import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;

@service
namespace TestService;

model Child {
  id: string;
}

@Azure.ResourceManager.Legacy.externalTypeRef("./external.json#/definitions/Widget")
model Widget {
  child: Child;
}

namespace Operations {
  interface Widget {
    @get @route("/widgets") get(): TestService.Widget;
  }
}

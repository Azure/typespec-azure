import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using Azure.Core;
using Azure.ClientGenerator.Core;

@service
@server(
  "{endpoint}",
  "Endpoint",
  {
    endpoint: url,
  }
)
namespace LroMetadataPaging;

model Item {
  value: string;
}

model Page {
  @pageItems items: Item[];
  @TypeSpec.nextLink next?: string;
}

model Status {
  @lroStatus status: "Succeeded" | "Failed" | "Canceled" | "Running";
  @lroStatusMetadata progress?: int32;
  @lroResult result: Page;
}

@list
@route("/jobs")
@post
op start(): {
  @pollingLocation @header("Operation-Location") location: ResourceLocation<Status>;
  @body body: Page;
};

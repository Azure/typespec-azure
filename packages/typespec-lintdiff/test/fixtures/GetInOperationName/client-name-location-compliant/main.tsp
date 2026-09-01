import "../../lib/imports.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;
using TypeSpec.Http;

@service(#{ title: "Test Service" })
namespace TestService;

interface ScopeAccessReviewHistoryDefinitionInstances {
  @doc("Lists access review history definitions.")
  @route("/accessReviewHistoryDefinitions")
  @get
  fetchByScope(): {
    @statusCode statusCode: 200;
    @body definitions: string[];
  };
}

@@clientLocation(
  ScopeAccessReviewHistoryDefinitionInstances.fetchByScope,
  "ScopeAccessReviewHistoryDefinitions"
);
@@clientName(ScopeAccessReviewHistoryDefinitionInstances.fetchByScope, "List");

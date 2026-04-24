import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";

using global.Azure.ClientGenerator.Core;

// Shorten generated client type names for csharp to avoid exceeding the
// Windows 260-character path limit when test projects are emitted.
@@clientName(_Specs_.Azure.ClientGenerator.Core.ClientInitialization.IndividuallyParentClient.IndividuallyParentNestedWithPathClient,
  "NestedWithPathClient",
  "csharp"
);
@@clientName(_Specs_.Azure.ClientGenerator.Core.ClientInitialization.IndividuallyParentClient.IndividuallyParentNestedWithQueryClient,
  "NestedWithQueryClient",
  "csharp"
);
@@clientName(_Specs_.Azure.ClientGenerator.Core.ClientInitialization.IndividuallyParentClient.IndividuallyParentNestedWithHeaderClient,
  "NestedWithHeaderClient",
  "csharp"
);
@@clientName(_Specs_.Azure.ClientGenerator.Core.ClientInitialization.IndividuallyParentClient.IndividuallyParentNestedWithMultipleClient,
  "NestedWithMultipleClient",
  "csharp"
);
@@clientName(_Specs_.Azure.ClientGenerator.Core.ClientInitialization.IndividuallyParentClient.IndividuallyParentNestedWithMixedClient,
  "NestedWithMixedClient",
  "csharp"
);
@@clientName(_Specs_.Azure.ClientGenerator.Core.ClientInitialization.IndividuallyParentClient.IndividuallyParentNestedWithParamAliasClient,
  "NestedWithParamAliasClient",
  "csharp"
);

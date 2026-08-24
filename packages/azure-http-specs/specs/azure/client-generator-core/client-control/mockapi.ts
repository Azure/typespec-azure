import { json, passOnSuccess, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_ClientControl_ProtocolApi_get = passOnSuccess({
  uri: "/azure/client-generator-core/client-control/protocol-api",
  method: "get",
  response: {
    status: 200,
    body: json({ value: "protocol" }),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ClientGenerator_Core_ClientControl_ClientOption_get = passOnSuccess({
  uri: "/azure/client-generator-core/client-control/client-option",
  method: "get",
  response: {
    status: 200,
    body: json({ id: "client-option" }),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ClientGenerator_Core_ClientControl_SystemTextJson_get = passOnSuccess({
  uri: "/azure/client-generator-core/client-control/system-text-json",
  method: "get",
  response: {
    status: 200,
    body: json({ value: "system-text-json" }),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ClientGenerator_Core_ClientControl_Scope_get = passOnSuccess({
  uri: "/azure/client-generator-core/client-control/scope",
  method: "get",
  response: {
    status: 200,
    body: json({
      common: "all-languages",
      languageSpecific: "csharp",
    }),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ClientGenerator_Core_ClientControl_OperationScope_get = passOnSuccess({
  uri: "/azure/client-generator-core/client-control/operation-scope",
  method: "get",
  response: {
    status: 200,
    body: json({ value: "csharp" }),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ClientGenerator_Core_ClientControl_DisablePageable_list = passOnSuccess({
  uri: "/azure/client-generator-core/client-control/disable-pageable",
  method: "get",
  response: {
    status: 200,
    body: json({ value: ["first", "second"] }),
  },
  kind: "MockApiDefinition",
});

import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

const SUBSCRIPTION_ID_EXPECTED = "00000000-0000-0000-0000-000000000000";
const validCheckNameAvailability = {
  nameAvailable: true,
  reason: "AlreadyExists",
  message: "",
};

// Check Global Name Availability
Scenarios.Azure_ResourceManager_OperationTemplates_CheckNameAvailability_checkGlobal =
  passOnSuccess({
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/checkNameAvailability",
    method: "post",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        "api-version": "2023-12-01-preview",
      },
      body: {
        name: "checkName",
        type: "Microsoft.Web/site",
      },
    },
    response: {
      status: 200,
      body: json({
        ...validCheckNameAvailability,
        message: "This is a global name availability check message.",
      }),
    },
    kind: "MockApiDefinition",
  });

// Check Local Name Availability
Scenarios.Azure_ResourceManager_OperationTemplates_CheckNameAvailability_checkLocal = passOnSuccess(
  {
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/:location/checkNameAvailability",
    method: "post",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        location: "westus",
        "api-version": "2023-12-01-preview",
      },
      body: {
        name: "checkName",
        type: "Microsoft.Web/site",
      },
    },
    response: {
      status: 200,
      body: json({
        ...validCheckNameAvailability,
        message: "This is a local name availability check message.",
      }),
    },
    kind: "MockApiDefinition",
  },
);

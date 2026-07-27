import { createRule, type ModelProperty } from "@typespec/compiler";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation } from "@typespec/http";

export const requestBodyOptionalRule = createRule({
  name: "request-body-optional",
  description:
    "Data-plane PUT, POST, and PATCH operations must not declare optional request bodies.",
  severity: "warning",
  messages: {
    default: "The body parameter is not marked as required.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (resolveProviderNamespace(context.program, namespace) !== undefined) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (
          httpOperation.verb !== "put" &&
          httpOperation.verb !== "post" &&
          httpOperation.verb !== "patch"
        ) {
          return;
        }

        const bodyProperty = getOptionalBodyProperty(httpOperation);
        if (bodyProperty === undefined) {
          return;
        }

        context.reportDiagnostic({
          target: bodyProperty,
        });
      },
    };
  },
});

function getOptionalBodyProperty(
  httpOperation: ReturnType<typeof getHttpOperation>[0],
): ModelProperty | undefined {
  const body = httpOperation.parameters.body;
  if (body === undefined || body.bodyKind !== "single") {
    return undefined;
  }

  if (body.property?.optional) {
    return body.property;
  }

  const topLevelBodyProperties = httpOperation.parameters.properties.filter(
    (property) => property.kind === "bodyProperty" && property.path.length === 1,
  );

  if (topLevelBodyProperties.length !== 1) {
    return undefined;
  }

  return topLevelBodyProperties[0].property.optional
    ? topLevelBodyProperties[0].property
    : undefined;
}

import {
  type Interface,
  type Model,
  type ModelProperty,
  type Operation,
  type Program,
  createRule,
  fileRef,
  getLocationContext,
  getProperty,
  isArrayModelType,
  walkPropertiesInherited,
} from "@typespec/compiler";
import { type HttpOperationResponse } from "@typespec/http";
import { resolveArmResources } from "../resource.js";

export const listResponseEnvelopeRule = createRule({
  name: "list-response-envelope",
  docs: fileRef.fromPackageRoot("src/rules/list-response-envelope.md"),
  description: "ARM list responses must use a value array and the standard nextLink envelope.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/list-response-envelope",
  messages: {
    default:
      "ARM resource list response models must declare exactly the `value` and `nextLink` properties.",
    valueArray: "ARM resource list responses must declare a 'value' property of array type.",
  },
  create(context) {
    return {
      root(program) {
        const provider = resolveArmResources(program);
        const checked = new Set<Operation>();
        for (const resource of provider.resources ?? []) {
          for (const { operation, httpOperation } of resource.operations.lists) {
            if (checked.has(operation)) continue;
            checked.add(operation);

            const responseModel = get200ResponseModel(httpOperation.responses);
            if (responseModel === undefined) continue;

            const value = getProperty(responseModel, "value");
            if (
              value !== undefined &&
              (value.type.kind !== "Model" || !isArrayModelType(value.type))
            ) {
              context.reportDiagnostic({
                target: getDiagnosticTarget(program, operation, value),
                messageId: "valueArray",
              });
              continue;
            }

            for (const invalidTarget of getInvalidTargets(responseModel)) {
              context.reportDiagnostic({
                target: getDiagnosticTarget(program, operation, invalidTarget),
              });
            }
          }
        }
      },
    };
  },
});

function get200ResponseModel(responses: HttpOperationResponse[]): Model | undefined {
  for (const response of responses) {
    if (response.statusCodes !== 200) {
      continue;
    }

    for (const content of response.responses) {
      const body = content.body;
      if (body?.bodyKind !== "single" || body.type.kind !== "Model") {
        continue;
      }

      const bodyModel = body.property?.type.kind === "Model" ? body.property.type : body.type;
      if (isArrayModelType(bodyModel) || [...walkPropertiesInherited(bodyModel)].length === 0) {
        continue;
      }

      return bodyModel;
    }
  }

  return undefined;
}

function getInvalidTargets(responseModel: Model): (Model | ModelProperty)[] {
  const invalidTargets: ModelProperty[] = [];
  let hasValue = false;
  let hasNextLink = false;

  for (const property of walkPropertiesInherited(responseModel)) {
    if (property.name === "value") {
      hasValue = true;
    } else if (property.name === "nextLink") {
      hasNextLink = true;
    } else {
      invalidTargets.push(property);
    }
  }

  return invalidTargets.length === 0 && (!hasValue || !hasNextLink)
    ? [responseModel]
    : invalidTargets;
}

function getDiagnosticTarget(
  program: Program,
  operation: Operation,
  invalidTarget: Model | ModelProperty,
): Interface | Operation | Model | ModelProperty {
  if (getLocationContext(program, invalidTarget).type === "project") {
    return invalidTarget;
  }

  if (getLocationContext(program, operation).type === "project") {
    return operation;
  }

  return operation.interface ?? operation;
}

import {
  createRule,
  getProperty,
  isArrayModelType,
  paramMessage,
  type DiagnosticTarget,
  type Operation,
  type Type,
} from "@typespec/compiler";
import { getArmResourceOperationData } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation } from "@typespec/http";
import { getExtensions, resolveOperationId } from "@typespec/openapi";

const listOperationIdPattern = /^.+_List[^_]*$/;

export const collectionObjectPropertiesNamingRule = createRule({
  name: "collection-object-properties-naming",
  description:
    "ARM list operations with x-ms-pageable and upstream-compatible operationIds must return an object with a value array property.",
  severity: "warning",
  messages: {
    default:
      paramMessage`Collection object returned by list operation '${"operationId"}' with 'x-ms-pageable' extension must declare a 'value' property of array type.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const armOperation = getArmResourceOperationData(context.program, operation);
        if (armOperation?.kind !== "list") {
          return;
        }

        if (!getExtensions(context.program, operation).has("x-ms-pageable")) {
          return;
        }

        const operationId = resolveOperationId(context.program, operation);
        if (!listOperationIdPattern.test(operationId)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        for (const response of httpOperation.responses) {
          if (response.statusCodes !== 200) {
            continue;
          }

          for (const content of response.responses) {
            if (content.body === undefined) {
              continue;
            }

            const target = getInvalidCollectionTarget(operation, content.body.type);
            if (target === undefined) {
              continue;
            }

            context.reportDiagnostic({
              target,
              format: {
                operationId,
              },
            });
            return;
          }
        }
      },
    };
  },
});

function getInvalidCollectionTarget(
  operation: Operation,
  responseType: Type,
): DiagnosticTarget | undefined {
  if (responseType.kind !== "Model") {
    return operation;
  }

  const valueProperty = getProperty(responseType, "value");
  if (valueProperty === undefined) {
    return responseType;
  }

  return valueProperty.type.kind === "Model" && isArrayModelType(valueProperty.type)
    ? undefined
    : valueProperty;
}

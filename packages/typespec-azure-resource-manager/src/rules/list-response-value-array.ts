import {
  createRule,
  fileRef,
  getLocationContext,
  getPagingOperation,
  getProperty,
  isArrayModelType,
  isList,
  type DiagnosticTarget,
  type Operation,
  type Type,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const listResponseValueArrayRule = createRule({
  name: "list-response-value-array",
  docs: fileRef.fromPackageRoot("src/rules/list-response-value-array.md"),
  description: "Paged ARM list responses must have a value array property.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/list-response-value-array",
  messages: {
    default: "Paged ARM list responses must declare a 'value' property of array type.",
  },
  create(context) {
    return {
      operation: (operation) => {
        if (
          getLocationContext(context.program, operation).type !== "project" ||
          !isList(context.program, operation)
        ) {
          return;
        }

        const [paging] = getPagingOperation(context.program, operation);
        if (!paging?.output.nextLink) {
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

            context.reportDiagnostic({ target });
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

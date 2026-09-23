import {
  createRule,
  fileRef,
  getEffectiveModelType,
  getLocationContext,
  isTemplateDeclaration,
  isTemplateInstance,
  type Model,
  type Operation,
  type Type,
} from "@typespec/compiler";
import { getHttpOperation, isHeader, isStatusCode } from "@typespec/http";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const noUnnamedResponseBodiesRule = createRule({
  name: "no-unnamed-response-bodies",
  docs: fileRef.fromPackageRoot("src/rules/no-unnamed-response-bodies.md"),
  description:
    "Operation response bodies should use named models instead of anonymous inline model expressions.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-unnamed-response-bodies",
  messages: {
    default:
      "Operation response body should use a named model instead of an anonymous inline model expression.",
  },
  create(context) {
    const reported = new Set<Model>();
    return {
      operation: (operation) => {
        if (
          shouldSkipOperation(operation) ||
          getLocationContext(context.program, operation).type !== "project"
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        for (const response of httpOperation.responses) {
          const responseType = response.type;
          if (!isAnonymousModel(responseType) || reported.has(responseType)) {
            continue;
          }
          for (const content of response.responses) {
            const bodyType = content.body?.type;
            // Property-position bodies belong to Azure Core's no-unnamed-types rule.
            if (
              content.body?.property ||
              bodyType?.kind !== "Model" ||
              bodyType.properties.size === 0 ||
              getEffectiveModelType(
                context.program,
                bodyType,
                (property) =>
                  !isHeader(context.program, property) && !isStatusCode(context.program, property),
              ).name !== ""
            ) {
              continue;
            }

            reported.add(responseType);
            context.reportDiagnostic({
              target: responseType,
            });
            break;
          }
        }
      },
    };
  },
});

function shouldSkipOperation(operation: Operation): boolean {
  return (
    isTemplateInstance(operation) ||
    isTemplateDeclaration(operation) ||
    !!isTemplatedInterfaceOperation(operation)
  );
}

function isAnonymousModel(type: Type | undefined): type is Model {
  return type?.kind === "Model" && type.name === "";
}

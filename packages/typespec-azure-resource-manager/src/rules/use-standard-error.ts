import {
  createRule,
  fileRef,
  getDiscriminatedUnion,
  getNamespaceFullName,
  isErrorModel,
  isTemplateDeclarationOrInstance,
  type Operation,
  type Program,
  type Type,
} from "@typespec/compiler";
import { getOperationVerb, getResponsesForOperation } from "@typespec/http";
import { getSingleNonNullMember } from "./model-utils.js";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const useStandardErrorRule = createRule({
  name: "use-standard-error",
  docs: fileRef.fromPackageRoot("src/rules/use-standard-error.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-standard-error",
  description:
    "Operations must define a response marked with @error and use ErrorResponse from ARM common types for marked error payloads.",
  severity: "warning",
  messages: {
    default:
      "Error responses must have a body using `Azure.ResourceManager.CommonTypes.ErrorResponse` instead of a custom error payload.",
    missingErrorResponse: "Operations must define at least one response marked with `@error`.",
  },
  create(context) {
    const program = context.program;
    const reported = new Set<Operation | Operation["node"]>();

    return {
      operation(operation) {
        const source = operation.node ?? operation;
        if (
          reported.has(source) ||
          isTemplateDeclarationOrInstance(operation) ||
          isTemplatedInterfaceOperation(operation)
        ) {
          return;
        }

        const errorTypes = [...getResponseTypes(program, operation.returnType)].filter((type) =>
          isErrorModel(program, type),
        );
        if (errorTypes.length === 0) {
          context.reportDiagnostic({ target: operation, messageId: "missingErrorResponse" });
          reported.add(source);
          return;
        }

        const isHead = getOperationVerb(program, operation) === "head";
        const invalidBody = errorTypes.some((type) => {
          // Resolve each marked variant separately: status groups retain only their first type.
          const [responses] = getResponsesForOperation(program, { ...operation, returnType: type });
          return responses.some((response) =>
            response.responses.some(({ body }) =>
              body === undefined
                ? !isHead
                : body.bodyKind !== "single" || !isStandardError(body.type),
            ),
          );
        });
        if (invalidBody) {
          context.reportDiagnostic({ target: operation });
          reported.add(source);
        }
      },
    };
  },
});

function isStandardError(type: Type): boolean {
  if (type.kind === "Union") {
    const member = getSingleNonNullMember(type);
    return member !== undefined && isStandardError(member);
  }
  return (
    type.kind === "Model" &&
    type.name === "ErrorResponse" &&
    type.namespace !== undefined &&
    getNamespaceFullName(type.namespace) === "Azure.ResourceManager.CommonTypes"
  );
}

function* getResponseTypes(program: Program, type: Type): Iterable<Type> {
  if (type.kind === "Union" && getDiscriminatedUnion(program, type)[0] === undefined) {
    for (const variant of type.variants.values()) {
      yield* getResponseTypes(program, variant.type);
    }
  } else {
    yield type;
  }
}

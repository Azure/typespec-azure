import { createRule, fileRef, getLocationContext, isVoidType, type Type } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const useModelRequestBodyRule = createRule({
  name: "use-model-request-body",
  docs: fileRef.fromPackageRoot("src/rules/use-model-request-body.md"),
  description: "Request bodies must use plain models.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-model-request-body",
  messages: {
    default:
      "Request bodies must use plain models. Replace this body type with a model without an indexer.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        const body = httpOperation.parameters.body;
        if (body === undefined || body.bodyKind === "multipart") {
          return;
        }

        const bodyType = getUnderlyingType(body.type);
        if (isVoidType(bodyType) || (body.bodyKind === "single" && isPlainModel(bodyType))) {
          return;
        }

        context.reportDiagnostic({
          target:
            body.property && getLocationContext(context.program, body.property).type === "project"
              ? body.property
              : operation,
        });
      },
    };
  },
});

function getUnderlyingType(type: Type): Type {
  while (type.kind === "ModelProperty") {
    type = type.type;
  }
  return type;
}

function isPlainModel(type: Type): boolean {
  return type.kind === "Model" && type.indexer === undefined;
}

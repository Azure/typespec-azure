import {
  createRule,
  fileRef,
  getLocationContext,
  isTemplateDeclaration,
  type Model,
} from "@typespec/compiler";
import { getHttpOperation, type HttpOperationResponse } from "@typespec/http";
import { getArmResource } from "../resource.js";
import { getProperties, isTemplatedInterfaceOperation } from "./utils.js";

export const useResourceModelForPutRule = createRule({
  name: "use-resource-model-for-put",
  docs: fileRef.fromPackageRoot("src/rules/use-resource-model-for-put.md"),
  description: "Use registered ARM resource models for PUT resource responses.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-resource-model-for-put",
  messages: {
    default: "PUT 200/201 resource response models must be registered as ARM resources.",
  },
  create(context) {
    return {
      operation(operation) {
        if (
          getLocationContext(context.program, operation).type !== "project" ||
          isTemplateDeclaration(operation) ||
          isTemplatedInterfaceOperation(operation)
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "put") return;

        const responseModel =
          getResponseModel(httpOperation.responses, 200) ??
          getResponseModel(httpOperation.responses, 201);
        if (responseModel === undefined) return;

        const properties = getProperties(responseModel);
        if (
          !properties.some((property) => property.name === "name") ||
          !properties.some((property) => property.name === "type")
        ) {
          return;
        }

        if (getArmResource(context.program, responseModel) !== undefined) return;

        context.reportDiagnostic({ target: responseModel });
      },
    };
  },
});

function getResponseModel(
  responses: HttpOperationResponse[],
  statusCode: number,
): Model | undefined {
  for (const response of responses) {
    if (response.statusCodes !== statusCode) continue;
    for (const content of response.responses) {
      if (content.body?.type.kind === "Model") return content.body.type;
    }
  }
  return undefined;
}

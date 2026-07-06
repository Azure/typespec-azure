import { ClientModel } from "../../interfaces.js";
import { getClientName } from "../../utils/name-constructors.js";
import { renderTemplate } from "../render-template.js";
import { snippetsContent } from "./template.js";

export function buildSnippets(model: ClientModel, clientName?: string) {
  // to keep the same config for azure scope in buildReadmeFile.ts
  if (
    (model?.options?.packageDetails?.scopeName === "azure" ||
      model?.options?.packageDetails?.scopeName === "azure-rest") &&
    model.options.addCredentials
  ) {
    return {
      path: "test/snippets.spec.ts",
      content: renderTemplate(snippetsContent, {
        clientClassName: clientName ? clientName : getClientName(model),
        azureArm: model.options?.azureArm,
        hasSubscriptionId: model.options.hasSubscriptionId,
      }),
    };
  }
  return undefined;
}

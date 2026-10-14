import {
  createRule,
  fileRef,
  getLocationContext,
  isTemplateInstance,
  paramMessage,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { isTemplatedInterfaceOperation } from "./utils.js";

const evenSegmentedArmPutPathPattern = /.*\/providers\/\w+\.\w+(\/\w+\/(default|\{\w+\}))+$/;

export const useResourcePathForPutRule = createRule({
  name: "use-resource-path-for-put",
  description: "ARM PUT paths must end in resource type and resource name pairs.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-resource-path-for-put",
  docs: fileRef.fromPackageRoot("src/rules/use-resource-path-for-put.md"),
  messages: {
    default: paramMessage`ARM PUT path '${"path"}' must end in repeated /{resourceType}/{resourceName} or /{resourceType}/default pairs after the provider namespace.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        if (
          isTemplateInstance(operation) ||
          isTemplatedInterfaceOperation(operation) ||
          getLocationContext(context.program, operation).type !== "project"
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (
          httpOperation.verb !== "put" ||
          evenSegmentedArmPutPathPattern.test(httpOperation.path)
        ) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
          format: { path: httpOperation.path },
        });
      },
    };
  },
});

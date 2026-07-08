import {
  Operation,
  Program,
  createRule,
  isTemplateInstance,
  paramMessage,
} from "@typespec/compiler";
import { HttpVerb, getOperationVerb } from "@typespec/http";
import { getSegment } from "@typespec/rest";
import {
  isSourceOperationResourceManagerInternal,
  isTemplatedInterfaceOperation,
} from "./utils.js";

export const armResourceOperationMissingDecoratorRule = createRule({
  name: "arm-resource-operation-missing-decorator",
  severity: "warning",
  description: "Validate ARM Resource operations use the correct decorator for the HTTP verb.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-resource-operation-missing-decorator",
  messages: {
    default: paramMessage`Resource ${"verb"} operation must be decorated with ${"decorator"}.`,
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (
          !isSourceOperationResourceManagerInternal(operation) &&
          !isTemplateInstance(operation)
        ) {
          const verb = getOperationVerb(context.program, operation);
          if (verb && isTemplatedInterfaceOperation(operation) === false) {
            const requiredDecorators = resourceOperationDecorators[verb];
            if (requiredDecorators?.length > 0) {
              const decorator = operation.decorators.find(
                (d) => requiredDecorators.indexOf(d.decorator.name) >= 0,
              );
              if (!decorator && !isArmProviderOperation(context.program, operation)) {
                context.reportDiagnostic({
                  target: operation,
                  format: {
                    verb: verb.toUpperCase(),
                    decorator: requiredDecorators.map((d) => `@${d.substring(1)}`).join(" or "),
                  },
                });
              }
            }
          }
        }
      },
    };
  },
});

const resourceOperationDecorators: { [verb in HttpVerb]: string[] } = {
  put: ["$armResourceCreateOrUpdate"],
  get: ["$armResourceRead", "$armResourceList"],
  patch: ["$armResourceUpdate"],
  delete: ["$armResourceDelete"],
  post: ["$armResourceAction", "$armResourceCollectionAction"],
  head: [],
};

function isStaticSegment(segment: string | undefined): boolean {
  return segment === undefined || segment === "locations";
}

function isArmProviderOperation(program: Program, operation: Operation): boolean {
  let isProviderAction = false;

  for (const [index, [, property]] of [...operation.parameters.properties].entries()) {
    const segment = getSegment(program, property);

    if (segment === "providers") {
      isProviderAction = true;
    } else if (isProviderAction && !isStaticSegment(segment)) {
      return false;
    }

    const isLastSegment = index === operation.parameters.properties.size - 1;
    if (isLastSegment && !segment) {
      return true;
    }
  }

  return false;
}

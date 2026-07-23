import {
  DecoratorApplication,
  DecoratorArgument,
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

export const useOperationDecoratorRule = createRule({
  name: "use-operation-decorator",
  severity: "warning",
  description: "Validate ARM Resource operations use the correct decorator for the HTTP verb.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-operation-decorator",
  messages: {
    default: paramMessage`Resource ${"verb"} operation must be decorated with ${"decorator"}.`,
    invalidOperationType: paramMessage`Resource ${"verb"} operation decorator ${"decorator"} must use operationType ${"operationType"}.`,
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
                  messageId: "default",
                  target: operation,
                  format: {
                    verb: verb.toUpperCase(),
                    decorator: requiredDecorators.map((d) => `@${d.substring(1)}`).join(" or "),
                  },
                });
              } else if (decorator) {
                const allowedOperationTypes = operationTypesByVerb[verb];
                const operationType = getGenericDecoratorOperationType(decorator);

                if (
                  allowedOperationTypes !== undefined &&
                  operationType !== undefined &&
                  !allowedOperationTypes.includes(operationType)
                ) {
                  context.reportDiagnostic({
                    messageId: "invalidOperationType",
                    target: operation,
                    format: {
                      verb: verb.toUpperCase(),
                      decorator: `@${decorator.decorator.name.substring(1)}`,
                      operationType: allowedOperationTypes.map((x) => `"${x}"`).join(" or "),
                    },
                  });
                }
              }
            }
          }
        }
      },
    };
  },
});

// These private ARM decorators cover all operation types and serve as valid alternatives
// to the public per-verb decorators (e.g. in extension resource, legacy, and built-in operations).
const genericArmResourceDecorators = [
  "$extensionResourceOperation",
  "$legacyResourceOperation",
  "$builtInResourceOperation",
  "$legacyExtensionResourceOperation",
] as const;

const genericDecoratorOperationTypeArgIndex: Record<
  (typeof genericArmResourceDecorators)[number],
  number
> = {
  $extensionResourceOperation: 2,
  $legacyResourceOperation: 1,
  $builtInResourceOperation: 2,
  $legacyExtensionResourceOperation: 1,
};

const resourceOperationDecorators: { [verb in HttpVerb]: string[] } = {
  put: ["$armResourceCreateOrUpdate", ...genericArmResourceDecorators],
  get: ["$armResourceRead", "$armResourceList", ...genericArmResourceDecorators],
  patch: ["$armResourceUpdate", ...genericArmResourceDecorators],
  delete: ["$armResourceDelete", ...genericArmResourceDecorators],
  post: ["$armResourceAction", "$armResourceCollectionAction", ...genericArmResourceDecorators],
  head: [],
};

const operationTypesByVerb: Partial<Record<HttpVerb, readonly string[]>> = {
  put: ["createOrUpdate"],
  get: ["read", "list"],
  patch: ["update"],
  delete: ["delete"],
  post: ["action"],
};

function getGenericDecoratorOperationType(decorator: DecoratorApplication): string | undefined {
  const decoratorName = decorator.decorator.name as (typeof genericArmResourceDecorators)[number];
  if (!genericArmResourceDecorators.includes(decoratorName)) {
    return undefined;
  }

  const operationTypeArg = decorator.args[genericDecoratorOperationTypeArgIndex[decoratorName]];
  return getStringJsValue(operationTypeArg);
}

function getStringJsValue(arg: DecoratorArgument | undefined): string | undefined {
  return typeof arg?.jsValue === "string" ? arg.jsValue : undefined;
}

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

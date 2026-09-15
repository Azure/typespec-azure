import {
  type ArrayModelType,
  type Model,
  type ModelProperty,
  type Namespace,
  type Operation,
  type Program,
  type RecordModelType,
  type Scalar,
  type Type,
  createRule,
  fileRef,
  getFormat,
  getLocationContext,
  isArrayModelType,
  isRecordModelType,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { getAllHttpServices } from "@typespec/http";

import { getArmProviderNamespace } from "../namespace.js";
import { getArmResources } from "../resource.js";

export const noUuidRule = createRule({
  name: "no-uuid",
  docs: fileRef.fromPackageRoot("src/rules/no-uuid.md"),
  description:
    "ARM APIs should avoid UUID-typed schemas unless they have explicit Azure API review approval.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-uuid",
  messages: {
    default:
      "UUID usage is not recommended. If UUIDs are required in your service, get sign-off from the Azure API review board.",
  },
  create(context) {
    const reportedTargets = new Set<ModelProperty | Operation>();
    const uuidScalar = $(context.program).type.resolve("Azure.Core.uuid", "Scalar");
    const [services] = getAllHttpServices(context.program);
    const armServices = services.filter((service) =>
      getArmProviderNamespace(context.program, service.namespace),
    );
    const resourceKeyByOperation = getResourceKeyByOperation(context.program);

    return {
      modelProperty: (property) => {
        if (!isInArmService(property.model?.namespace, armServices)) {
          return;
        }

        if (
          getFormat(context.program, property) === "uuid" ||
          containsUuid(context.program, uuidScalar, property.type)
        ) {
          reportTarget(context, property, reportedTargets);
        }
      },
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (
          isInArmService(namespace, armServices) &&
          containsUuid(context.program, uuidScalar, operation.returnType)
        ) {
          reportTarget(context, operation, reportedTargets);
        }
      },
      root: () => {
        for (const service of armServices) {
          for (const httpOperation of service.operations) {
            const operation = httpOperation.operation;
            const resourceKey = resourceKeyByOperation.get(operation);
            if (resourceKey === undefined) {
              continue;
            }

            const parameter = httpOperation.parameters.parameters.find(
              (parameter) => parameter.param.name === resourceKey,
            );
            if (
              parameter !== undefined &&
              (getFormat(context.program, parameter.param) === "uuid" ||
                containsUuid(context.program, uuidScalar, parameter.param.type))
            ) {
              reportTarget(context, operation, reportedTargets);
            }
          }
        }
      },
    };
  },
});

function getResourceKeyByOperation(program: Program): Map<Operation, string> {
  const result = new Map<Operation, string>();
  for (const resource of getArmResources(program)) {
    if (resource.keyName === undefined) {
      continue;
    }

    const operations = [
      ...Object.values(resource.operations.lifecycle),
      ...Object.values(resource.operations.lists),
      ...Object.values(resource.operations.actions),
    ];
    for (const operation of operations) {
      if (operation !== undefined) {
        result.set(operation.operation, resource.keyName);
      }
    }
  }
  return result;
}

function isWithinNamespace(namespace: Namespace, ancestor: Namespace): boolean {
  for (let current: Namespace | undefined = namespace; current; current = current.namespace) {
    if (current === ancestor) {
      return true;
    }
  }
  return false;
}

function isInArmService(
  namespace: Namespace | undefined,
  services: readonly { namespace: Namespace }[],
): boolean {
  return (
    namespace !== undefined &&
    services.some((service) => isWithinNamespace(namespace, service.namespace))
  );
}

function containsUuid(
  program: Program,
  uuidScalar: Scalar | undefined,
  type: Type,
  seen = new Set<Type>(),
): boolean {
  if (seen.has(type)) {
    return false;
  }

  seen.add(type);

  switch (type.kind) {
    case "Scalar":
      return (
        type === uuidScalar ||
        getFormat(program, type) === "uuid" ||
        (type.baseScalar !== undefined && containsUuid(program, uuidScalar, type.baseScalar, seen))
      );
    case "Model":
      if (isContainerModel(type)) {
        return containsUuid(program, uuidScalar, type.indexer.value, seen);
      }
      if (getLocationContext(program, type).type === "project") {
        return false;
      }
      // Project model properties are visited by the linter. Recurse only through library wrappers
      // such as ArmResponse<T>, whose instantiated payload property cannot be reported directly.
      return [...type.properties.values()].some(
        (property) =>
          getLocationContext(program, property).type !== "project" &&
          (getFormat(program, property) === "uuid" ||
            containsUuid(program, uuidScalar, property.type, new Set(seen))),
      );
    case "Tuple":
      return type.values.some((value) => containsUuid(program, uuidScalar, value, new Set(seen)));
    case "Union":
      return [...type.variants.values()].some((variant) =>
        containsUuid(program, uuidScalar, variant.type, new Set(seen)),
      );
    default:
      return false;
  }
}

function reportTarget(
  context: Parameters<typeof noUuidRule.create>[0],
  target: ModelProperty | Operation,
  reportedTargets: Set<ModelProperty | Operation>,
): void {
  if (!reportedTargets.has(target)) {
    reportedTargets.add(target);
    context.reportDiagnostic({ target });
  }
}

function isContainerModel(model: Model): model is ArrayModelType | RecordModelType {
  return isArrayModelType(model) || isRecordModelType(model);
}

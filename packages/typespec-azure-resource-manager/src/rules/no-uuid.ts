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
  getSourceLocation,
  isArrayModelType,
  isRecordModelType,
  walkPropertiesInherited,
} from "@typespec/compiler";
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
    const [uuidType] = context.program.resolveTypeReference("Azure.Core.uuid");
    const uuidScalar = uuidType?.kind === "Scalar" ? uuidType : undefined;
    const [services] = getAllHttpServices(context.program);
    const armServices = services.filter((service) =>
      getArmProviderNamespace(context.program, service.namespace),
    );
    const resourceKeyByOperation = getResourceKeyByOperation(context.program);

    return {
      modelProperty: (property) => {
        const model = property.model;
        const modelNamespace = model?.namespace;
        if (
          !model?.name ||
          modelNamespace === undefined ||
          !armServices.some((service) => isWithinNamespace(modelNamespace, service.namespace))
        ) {
          return;
        }

        const target = getProjectProperty(context.program, property);
        if (target !== undefined) {
          reportUuidUsage(
            context,
            uuidScalar,
            property.type,
            target,
            reportedTargets,
            new Set(),
            true,
            property,
          );
        }
      },
      root: () => {
        for (const service of armServices) {
          for (const httpOperation of service.operations) {
            const operation = httpOperation.operation;
            for (const parameter of httpOperation.parameters.parameters) {
              const target =
                parameter.param.name === resourceKeyByOperation.get(operation)
                  ? operation
                  : getProjectProperty(context.program, parameter.param);
              if (target !== undefined) {
                if (getFormat(context.program, parameter.param) === "uuid") {
                  reportTarget(context, target, reportedTargets);
                } else {
                  reportUuidUsage(
                    context,
                    uuidScalar,
                    parameter.param.type,
                    target,
                    reportedTargets,
                  );
                }
              }
            }

            const requestBody = httpOperation.parameters.body;
            if (requestBody !== undefined) {
              reportUuidUsage(
                context,
                uuidScalar,
                requestBody.type,
                getPayloadTarget(context.program, requestBody.property, operation),
                reportedTargets,
              );
            }

            for (const response of httpOperation.responses) {
              for (const content of response.responses) {
                if (content.body !== undefined) {
                  reportUuidUsage(
                    context,
                    uuidScalar,
                    content.body.type,
                    getPayloadTarget(context.program, content.body.property, operation),
                    reportedTargets,
                  );
                }

                for (const header of Object.values(content.headers ?? {})) {
                  const target = getProjectProperty(context.program, header);
                  if (target !== undefined) {
                    reportUuidUsage(context, uuidScalar, header.type, target, reportedTargets);
                  }
                }
              }
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

function reportUuidUsage(
  context: Parameters<typeof noUuidRule.create>[0],
  uuidScalar: Scalar | undefined,
  type: Type,
  target: ModelProperty | Operation,
  reportedTargets: Set<ModelProperty | Operation>,
  seen = new Set<Type>(),
  canReportTarget = true,
  formatSource?: ModelProperty,
): void {
  const formattedProperty = formatSource ?? (target.kind === "ModelProperty" ? target : undefined);
  if (
    formattedProperty !== undefined &&
    getFormat(context.program, formattedProperty) === "uuid" &&
    canReportTarget &&
    isProjectDeclaration(context.program, target)
  ) {
    reportTarget(context, target, reportedTargets);
  }

  if (seen.has(type)) {
    return;
  }

  seen.add(type);

  switch (type.kind) {
    case "Scalar":
      if (type === uuidScalar || getFormat(context.program, type) === "uuid") {
        if (canReportTarget && isProjectDeclaration(context.program, target)) {
          reportTarget(context, target, reportedTargets);
        }
      } else if (type.baseScalar !== undefined) {
        reportUuidUsage(
          context,
          uuidScalar,
          type.baseScalar,
          target,
          reportedTargets,
          seen,
          canReportTarget,
        );
      }
      return;
    case "Model":
      if (isContainerModel(type)) {
        reportUuidUsage(
          context,
          uuidScalar,
          type.indexer.value,
          target,
          reportedTargets,
          seen,
          canReportTarget,
        );
        return;
      }
      for (const property of walkPropertiesInherited(type)) {
        const propertyTarget = getProjectProperty(context.program, property);
        reportUuidUsage(
          context,
          uuidScalar,
          property.type,
          propertyTarget ?? target,
          reportedTargets,
          new Set(seen),
          propertyTarget !== undefined,
          property,
        );
      }
      return;
    case "Tuple":
      for (const value of type.values) {
        reportUuidUsage(
          context,
          uuidScalar,
          value,
          target,
          reportedTargets,
          new Set(seen),
          canReportTarget,
        );
      }
      return;
    case "Union":
      for (const variant of type.variants.values()) {
        reportUuidUsage(
          context,
          uuidScalar,
          variant.type,
          target,
          reportedTargets,
          new Set(seen),
          canReportTarget,
        );
      }
      return;
    default:
      return;
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

function getPayloadTarget(
  program: Program,
  property: ModelProperty | undefined,
  operation: Operation,
): ModelProperty | Operation {
  return property === undefined ? operation : (getProjectProperty(program, property) ?? operation);
}

function getProjectProperty(program: Program, property: ModelProperty): ModelProperty | undefined {
  let source = property;
  while (source.sourceProperty !== undefined) {
    source = source.sourceProperty;
  }
  return isProjectDeclaration(program, source) ? source : undefined;
}

function isProjectDeclaration(
  program: Program,
  declaration: Model | ModelProperty | Operation,
): boolean {
  if (getLocationContext(program, declaration).type === "project") {
    return true;
  }

  if (declaration.node === undefined) {
    return false;
  }

  const path = getSourceLocation(declaration.node).file.path.replaceAll("\\", "/");
  const projectRoot = program.projectRoot.replaceAll("\\", "/").replace(/\/$/, "");
  return path === projectRoot || path.startsWith(`${projectRoot}/`);
}

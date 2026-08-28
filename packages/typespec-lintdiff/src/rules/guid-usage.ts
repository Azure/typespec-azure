import {
  getArmProviderNamespace,
  getArmResources,
} from "@azure-tools/typespec-azure-resource-manager";
import {
  createRule,
  getFormat,
  getLocationContext,
  getSourceLocation,
  isArrayModelType,
  isRecordModelType,
  walkPropertiesInherited,
  type ArrayModelType,
  type Model,
  type ModelProperty,
  type Namespace,
  type Operation,
  type Program,
  type RecordModelType,
  type Type,
} from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";

export const guidUsageRule = createRule({
  name: "guid-usage",
  description:
    "ARM APIs should avoid GUID-typed schemas unless they have explicit Azure API review approval.",
  severity: "warning",
  messages: {
    default:
      "Usage of Guid is not recommended. If GUIDs are absolutely required in your service, please get sign off from the Azure API review board.",
  },
  create(context) {
    const reportedTargets = new Set<ModelProperty | Operation>();
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
          reportGuidUsage(
            context,
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
                getProjectProperty(context.program, parameter.param) ??
                (parameter.param.name === resourceKeyByOperation.get(operation)
                  ? operation
                  : undefined);
              if (target !== undefined) {
                if (getFormat(context.program, parameter.param) === "uuid") {
                  reportTarget(context, target, reportedTargets);
                } else {
                  reportGuidUsage(context, parameter.param.type, target, reportedTargets);
                }
              }
            }

            const requestBody = httpOperation.parameters.body;
            if (requestBody !== undefined) {
              reportGuidUsage(
                context,
                requestBody.type,
                getPayloadTarget(context.program, requestBody.property, operation),
                reportedTargets,
              );
            }

            for (const response of httpOperation.responses) {
              for (const content of response.responses) {
                if (content.body !== undefined) {
                  reportGuidUsage(
                    context,
                    content.body.type,
                    getPayloadTarget(context.program, content.body.property, operation),
                    reportedTargets,
                  );
                }

                for (const header of Object.values(content.headers ?? {})) {
                  const target = getProjectProperty(context.program, header);
                  if (target !== undefined) {
                    reportGuidUsage(context, header.type, target, reportedTargets);
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

function reportGuidUsage(
  context: Parameters<typeof guidUsageRule.create>[0],
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
      if (getFormat(context.program, type) === "uuid") {
        if (canReportTarget && isProjectDeclaration(context.program, target)) {
          reportTarget(context, target, reportedTargets);
        }
      } else if (type.baseScalar !== undefined) {
        reportGuidUsage(context, type.baseScalar, target, reportedTargets, seen, canReportTarget);
      }
      return;
    case "Model":
      if (isContainerModel(type)) {
        reportGuidUsage(
          context,
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
        reportGuidUsage(
          context,
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
        reportGuidUsage(context, value, target, reportedTargets, new Set(seen), canReportTarget);
      }
      return;
    case "Union":
      for (const variant of type.variants.values()) {
        reportGuidUsage(
          context,
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
  context: Parameters<typeof guidUsageRule.create>[0],
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

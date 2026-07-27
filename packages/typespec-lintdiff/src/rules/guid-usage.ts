import {
  createRule,
  getFormat,
  getSourceLocation,
  isArrayModelType,
  isRecordModelType,
  type ArrayModelType,
  type Model,
  type ModelProperty,
  type Operation,
  type Program,
  type RecordModelType,
  type Type,
} from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";
import { getArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";

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
    let armProgram: boolean | undefined;

    const isArmProgram = () =>
      (armProgram ??= getAllHttpServices(context.program)[0].some((service) =>
        getArmProviderNamespace(context.program, service.namespace),
      ));

    return {
      modelProperty: (property) => {
        if (
          !isArmProgram() ||
          !isAuthoredDeclaration(property) ||
          !hasGuidUsageInPropertyType(context.program, property.type)
        ) {
          return;
        }

        context.reportDiagnostic({
          target: property,
        });
      },
      operation: (operation) => {
        if (
          !isArmProgram() ||
          !isAuthoredDeclaration(operation) ||
          !hasGuidUsageInReturnType(context.program, operation.returnType)
        ) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
        });
      },
    };
  },
});

function hasGuidUsageInPropertyType(
  program: Program,
  type: Type,
  seen = new Set<Type>(),
): boolean {
  if (seen.has(type)) {
    return false;
  }

  seen.add(type);

  switch (type.kind) {
    case "Scalar":
      return getFormat(program, type) === "uuid"
        || (type.baseScalar !== undefined
          && hasGuidUsageInPropertyType(program, type.baseScalar, seen));
    case "Model":
      return isContainerModel(type)
        ? hasGuidUsageInPropertyType(program, type.indexer.value, seen)
        : false;
    case "Tuple":
      return type.values.some((value) => hasGuidUsageInPropertyType(program, value, seen));
    case "Union":
      return [...type.variants.values()].some((variant) =>
        hasGuidUsageInPropertyType(program, variant.type, seen),
      );
    default:
      return false;
  }
}

function hasGuidUsageInReturnType(
  program: Program,
  type: Type,
  seen = new Set<Type>(),
): boolean {
  if (seen.has(type)) {
    return false;
  }

  seen.add(type);

  switch (type.kind) {
    case "Scalar":
      return getFormat(program, type) === "uuid"
        || (type.baseScalar !== undefined
          && hasGuidUsageInReturnType(program, type.baseScalar, seen));
    case "Model":
      if (isContainerModel(type)) {
        return hasGuidUsageInReturnType(program, type.indexer.value, seen);
      }

      if (isAuthoredDeclaration(type)) {
        return false;
      }

      if (type.baseModel && hasGuidUsageInReturnType(program, type.baseModel, seen)) {
        return true;
      }

      return [...type.properties.values()].some((property) =>
        hasGuidUsageInReturnType(program, property.type, seen),
      );
    case "Tuple":
      return type.values.some((value) => hasGuidUsageInReturnType(program, value, seen));
    case "Union":
      return [...type.variants.values()].some((variant) =>
        hasGuidUsageInReturnType(program, variant.type, seen),
      );
    default:
      return false;
  }
}

function isContainerModel(model: Model): model is ArrayModelType | RecordModelType {
  return isArrayModelType(model) || isRecordModelType(model);
}

function isAuthoredDeclaration(
  declaration: Model | ModelProperty | Operation | { node?: unknown },
): boolean {
  if (declaration.node === undefined) {
    return false;
  }

  const filePath = getSourceLocation(declaration.node as any).file.path;
  return (
    !filePath.includes("/node_modules/") && !filePath.includes("\\node_modules\\")
  );
}

import {
  createRule,
  fileRef,
  isArrayModelType,
  isRecordModelType,
  type ArrayModelType,
  type Model,
  type RecordModelType,
  type Type,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const enumInsteadOfBooleanRule = createRule({
  name: "enum-instead-of-boolean",
  docs: fileRef.fromPackageRoot("src/rules/enum-instead-of-boolean.md"),
  description:
    "Boolean properties should use descriptive extensible enums when semantic values matter.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/enum-instead-of-boolean",
  messages: {
    default:
      "Consider using an extensible enum instead of a boolean property so the API shape is more descriptive.",
  },
  create(context) {
    return {
      modelProperty: (property) => {
        if (!containsBooleanScalar(property)) {
          return;
        }

        context.reportDiagnostic({
          target: property,
        });
      },
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);

        for (const response of httpOperation.responses) {
          if (containsBooleanScalar(response.type)) {
            context.reportDiagnostic({
              target: operation,
            });
            continue;
          }

          for (const content of response.responses) {
            if (content.body === undefined || !containsBooleanScalar(content.body.type)) {
              continue;
            }

            if (content.body.property !== undefined) {
              continue;
            }

            context.reportDiagnostic({
              target: operation,
            });
          }
        }
      },
    };
  },
});

function containsBooleanScalar(type: Type, seen = new Set<Type>()): boolean {
  if (seen.has(type)) {
    return false;
  }

  seen.add(type);

  if (type.kind === "ModelProperty") {
    return containsBooleanScalar(type.type, seen);
  }

  switch (type.kind) {
    case "Scalar":
      return isBooleanScalar(type);
    case "Model":
      return isContainerModel(type) && containsBooleanScalar(type.indexer.value, seen);
    case "Tuple":
      return type.values.some((value) => containsBooleanScalar(value, seen));
    case "Union":
      return [...type.variants.values()].some((variant) =>
        containsBooleanScalar(variant.type, seen),
      );
    default:
      return false;
  }
}

function isBooleanScalar(type: Type): boolean {
  if (type.kind !== "Scalar") {
    return false;
  }

  for (let scalar = type; ; scalar = scalar.baseScalar) {
    if (scalar.name === "boolean") {
      return true;
    }

    if (scalar.baseScalar === undefined) {
      break;
    }
  }

  return false;
}

function isContainerModel(model: Model): model is ArrayModelType | RecordModelType {
  return isArrayModelType(model) || isRecordModelType(model);
}

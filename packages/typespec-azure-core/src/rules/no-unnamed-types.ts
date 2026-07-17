import {
  createRule,
  getNamespaceFullName,
  isNullType,
  Model,
  ModelProperty,
  paramMessage,
  Program,
  Union,
} from "@typespec/compiler";
import {
  getHeaderFieldName,
  isBody,
  isBodyRoot,
  isHeader,
  isMetadata,
  isMultipartBodyProperty,
  isStatusCode,
} from "@typespec/http";

export const noUnnamedTypesRule = createRule({
  name: "no-unnamed-types",
  description:
    "Azure services should not have anonymous models or union expressions. Define them as named declarations.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-unnamed-types",
  messages: {
    default: paramMessage`Anonymous ${"type"} should be defined as a named ${"type"} declaration.`,
  },
  create(context) {
    const program = context.program;

    // Unions: collect all unnamed unions, then exclude specific patterns.
    const excludedUnions = new Set<Union>();
    const invalidUnions = new Set<Union>();

    // Models: collect all anonymous models, then exclude specific patterns.
    const invalidModels = new Set<Model>();
    const excludedModels = new Set<Model>();

    return {
      modelProperty: (prop) => {
        // Exclude unions used in status code or content-type header positions.
        const type = prop.type;
        if (type.kind === "Union" && !type.name) {
          if (
            isStatusCode(program, prop) ||
            (isHeader(program, prop) &&
              getHeaderFieldName(program, prop).toLowerCase() === "content-type")
          ) {
            excludedUnions.add(type);
          }
        }
      },
      operation: (operation) => {
        // Exclude the top-level return type union (response envelope).
        if (operation.returnType.kind === "Union") {
          excludedUnions.add(operation.returnType);
        }
      },
      union: (union) => {
        if (!union.name && !isOnlyNullableUnion(union)) {
          invalidUnions.add(union);
        }
      },
      model: (model: Model) => {
        if (
          model.name === "" &&
          model.properties.size > 0 &&
          !isStandardLibraryType(model) &&
          !isHttpEnvelope(program, model)
        ) {
          invalidModels.add(model);
        }
      },
      exit: () => {
        for (const union of invalidUnions) {
          if (!excludedUnions.has(union)) {
            context.reportDiagnostic({ target: union, format: { type: "union" } });
          }
        }
        for (const model of invalidModels) {
          if (!excludedModels.has(model)) {
            context.reportDiagnostic({ target: model, format: { type: "model" } });
          }
        }
      },
    };
  },
});

function isStandardLibraryType(type: Model | Union): boolean {
  const namespace = type.namespace;
  if (namespace === undefined) {
    return false;
  }
  const fullName = getNamespaceFullName(namespace);
  return (
    fullName === "TypeSpec" ||
    fullName === "Azure" ||
    fullName.startsWith("TypeSpec.") ||
    fullName.startsWith("Azure.")
  );
}

function isHttpEnvelope(program: Program, model: Model): boolean {
  for (const property of model.properties.values()) {
    if (
      isMetadata(program, property) ||
      isStatusCode(program, property as ModelProperty) ||
      isBody(program, property) ||
      isBodyRoot(program, property) ||
      isMultipartBodyProperty(program, property)
    ) {
      return true;
    }
  }
  return false;
}

/** Check if the union is only there to make the type nullable */
function isOnlyNullableUnion(union: Union): boolean {
  const nonNullVariants = [...union.variants.values()].filter((v) => !isNullType(v.type));
  return nonNullVariants.length <= 1;
}

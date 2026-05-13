import { createRule, Model, paramMessage, Scalar, Type } from "@typespec/compiler";

type ScalarFamily = "string" | "numeric" | "boolean";

/**
 * Determine if `type` is "logically" a value of one of the well-known scalar
 * families (string, numeric, boolean). Walks unions, enums, scalar-extends
 * chains, and literals.
 *
 * Returns the standard scalar family name if `type` reduces to a single
 * family, or `undefined` otherwise (e.g. model types, mixed unions, custom
 * non-numeric/non-string scalars such as utcDateTime, etc.).
 */
function getScalarFamily(type: Type): ScalarFamily | undefined {
  switch (type.kind) {
    case "Scalar": {
      // Walk up baseScalar chain to the root scalar.
      let root: Scalar = type;
      while (root.baseScalar !== undefined) {
        root = root.baseScalar;
      }
      switch (root.name) {
        case "string":
          return "string";
        case "boolean":
          return "boolean";
        case "numeric":
          return "numeric";
        default:
          return undefined;
      }
    }
    case "String":
    case "StringTemplate":
      return "string";
    case "Number":
      return "numeric";
    case "Boolean":
      return "boolean";
    case "Enum": {
      const families = new Set<ScalarFamily>();
      for (const member of type.members.values()) {
        if (typeof member.value === "number") {
          families.add("numeric");
        } else {
          // Members with string values or no explicit value are string-typed.
          families.add("string");
        }
      }
      return families.size === 1 ? [...families][0] : undefined;
    }
    case "EnumMember":
      return typeof type.value === "number" ? "numeric" : "string";
    case "Union": {
      const families = new Set<ScalarFamily>();
      for (const variant of type.variants.values()) {
        const family = getScalarFamily(variant.type);
        if (family === undefined) return undefined;
        families.add(family);
      }
      return families.size === 1 ? [...families][0] : undefined;
    }
    default:
      return undefined;
  }
}

export const armNoReplaceInheritedPropsRule = createRule({
  name: "arm-no-replace-inherited-props",
  severity: "warning",
  description: "Disallow redefining properties already defined in a base type.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-no-replace-inherited-props",
  messages: {
    default: paramMessage`The property '${"propertyName"}' is also defined in the base model.  Redefining inherited properties can cause problems with OpenAPI tooling and some language representations of the models.`,
  },
  create(context) {
    return {
      model: (model: Model) => {
        if (model.baseModel === undefined) return;

        for (const property of model.properties.values()) {
          // Walk the chain of base models looking for a property with the
          // same name.
          let inherited: typeof property | undefined;
          let current: Model | undefined = model.baseModel;
          while (current !== undefined) {
            const found = current.properties.get(property.name);
            if (found !== undefined) {
              inherited = found;
              break;
            }
            current = current.baseModel;
          }

          if (inherited === undefined) continue;

          // Allow overriding when both the inherited property and the override
          // resolve to the same scalar family (e.g. both are "string"
          // -- including string scalars, string-derived scalars, string
          // literals, string enums, and open or closed string unions).
          const overrideFamily = getScalarFamily(property.type);
          const inheritedFamily = getScalarFamily(inherited.type);
          if (
            overrideFamily !== undefined &&
            inheritedFamily !== undefined &&
            overrideFamily === inheritedFamily
          ) {
            continue;
          }

          context.reportDiagnostic({
            format: { propertyName: property.name },
            target: property,
          });
        }
      },
    };
  },
});

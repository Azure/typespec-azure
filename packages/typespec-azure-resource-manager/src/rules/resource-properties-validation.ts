import {
  type Model,
  type ModelProperty,
  type Scalar,
  type Type,
  type Union,
  createRule,
  fileRef,
  paramMessage,
} from "@typespec/compiler";

import { getArmResource } from "../resource.js";
import { isReadonlyProperty } from "../utils.js";
import { walkJsonProperties } from "./model-utils.js";

const requiredProperties = ["name", "id", "type"] as const;

export const resourcePropertiesValidationRule = createRule({
  name: "resource-properties-validation",
  docs: fileRef.fromPackageRoot("src/rules/resource-properties-validation.md"),
  severity: "warning",
  description: "Validate required ARM resource properties and tags.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/resource-properties-validation",
  messages: {
    requiredProperties: paramMessage`ARM resource '${"resourceName"}' must define read-only 'name', 'id', and 'type' properties.`,
    tags: "The resource 'tags' property must be a record with string values.",
  },
  create(context) {
    return {
      model: (model: Model) => {
        if (getArmResource(context.program, model) === undefined) {
          return;
        }

        const properties = new Map<string, ModelProperty>();
        for (const [name, property] of walkJsonProperties(context.program, model)) {
          if (!properties.has(name)) {
            properties.set(name, property);
          }
        }

        if (
          requiredProperties.some((name) => {
            const property = properties.get(name);
            return property === undefined || !isReadonlyProperty(context.program, property);
          })
        ) {
          context.reportDiagnostic({
            messageId: "requiredProperties",
            format: { resourceName: model.name },
            target: model,
          });
        }

        const tags = properties.get("tags");
        if (tags !== undefined && !isStringRecord(tags.type)) {
          context.reportDiagnostic({
            messageId: "tags",
            target: tags,
          });
        }
      },
    };
  },
});

function isStringRecord(type: Type): boolean {
  return type.kind === "Model" && type.indexer !== undefined && isStringType(type.indexer.value);
}

function isStringType(type: Type): boolean {
  switch (type.kind) {
    case "Scalar": {
      let rootScalar: Scalar = type;
      while (rootScalar.baseScalar !== undefined) {
        rootScalar = rootScalar.baseScalar;
      }
      return rootScalar.name === "string";
    }
    case "String":
    case "StringTemplate":
      return true;
    case "Enum":
      return [...type.members.values()].every(
        (member) => member.value === undefined || typeof member.value === "string",
      );
    case "EnumMember":
      return type.value === undefined || typeof type.value === "string";
    case "UnionVariant":
      return isStringType(type.type);
    case "Union":
      return isStringUnion(type);
    default:
      return false;
  }
}

function isStringUnion(type: Union): boolean {
  return [...type.variants.values()].every((variant) => isStringType(variant.type));
}

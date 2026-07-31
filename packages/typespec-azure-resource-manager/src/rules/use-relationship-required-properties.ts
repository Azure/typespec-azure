import {
  type Model,
  type Program,
  createRule,
  getProperty,
  paramMessage,
} from "@typespec/compiler";

import { type AzureBaseTypeInfo, getAzureBaseTypes } from "../base-types.js";
import { getArmResources } from "../resource.js";

export const useRelationshipRequiredPropertiesRule = createRule({
  name: "use-relationship-required-properties",
  severity: "warning",
  description:
    "Resources decorated with @azureBaseType for the Relationship base type must be extension resources with the required Relationship schema.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-relationship-required-properties",
  messages: {
    missingProperties: paramMessage`Relationship resources must include required properties: ${"missing"}.`,
    notExtension: "Relationship resources must be extension resources.",
  },
  create(context) {
    return {
      root: (program: Program) => {
        const relationshipResources = getArmResources(program).filter((r) =>
          hasRelationshipBaseType(r.typespecType),
        );

        for (const relationshipResource of relationshipResources) {
          if (relationshipResource.kind !== "Extension") {
            context.reportDiagnostic({
              messageId: "notExtension",
              target: relationshipResource.typespecType,
            });
          }

          const properties = getProperty(relationshipResource.typespecType, "properties")?.type;
          if (properties?.kind !== "Model") {
            context.reportDiagnostic({
              messageId: "missingProperties",
              format: {
                missing: "sourceId, sourceTenant, targetId, targetTenant, provisioningState",
              },
              target: relationshipResource.typespecType,
            });
            continue;
          }

          const missing = [
            "sourceId",
            "sourceTenant",
            "targetId",
            "targetTenant",
            "provisioningState",
          ].filter((propertyName) => getProperty(properties, propertyName) === undefined);

          if (missing.length > 0) {
            context.reportDiagnostic({
              messageId: "missingProperties",
              format: { missing: missing.join(", ") },
              target: properties,
            });
          }
        }
      },
    };

    function hasRelationshipBaseType(model: Model): boolean {
      const visited = new Set<Model>();
      return hasRelationshipBaseTypeInternal(model, visited);
    }

    function hasRelationshipBaseTypeInternal(model: Model, visited: Set<Model>): boolean {
      if (visited.has(model)) return false;
      visited.add(model);

      const directTypes = getAzureBaseTypes(context.program, model);
      if (directTypes && isRelationship(directTypes)) return true;

      if (model.baseModel && hasRelationshipBaseTypeInternal(model.baseModel, visited)) {
        return true;
      }

      if (model.sourceModels) {
        for (const source of model.sourceModels) {
          if (hasRelationshipBaseTypeInternal(source.model, visited)) return true;
        }
      }

      return false;
    }

    function isRelationship(types: AzureBaseTypeInfo[]): boolean {
      return types.some((bt) => bt.baseType === "Relationship");
    }
  },
});

import { Model, Program, createRule, getProperty, paramMessage } from "@typespec/compiler";

import { AzureBaseTypeInfo, getAzureBaseTypes } from "../base-types.js";
import { getArmResources } from "../resource.js";

export const armRelationshipBaseTypeRequiredPropertiesRule = createRule({
  name: "arm-relationship-base-type-required-properties",
  severity: "warning",
  description:
    "Resources decorated with @azureBaseType for the Relationship base type must be extension resources with the required Relationship schema.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-relationship-base-type-required-properties",
  messages: {
    missingProperties: paramMessage`Relationship resources must include required properties: ${"missing"}.`,
    missingSourceProperties: paramMessage`Relationship source must include required properties: ${"missing"}.`,
    missingTargetProperties: paramMessage`Relationship target must include required properties: ${"missing"}.`,
    missingOriginInformationProperties: paramMessage`Relationship originInformation must include required properties: ${"missing"}.`,
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
                missing: "source, target, provisioningState",
              },
              target: relationshipResource.typespecType,
            });
            continue;
          }

          const missing = getMissingRequiredProperties(properties, [
            "source",
            "target",
            "provisioningState",
          ]);

          if (missing.length > 0) {
            context.reportDiagnostic({
              messageId: "missingProperties",
              format: { missing: missing.join(", ") },
              target: properties,
            });
          }

          validateNestedProperties(properties, "source", ["id", "type"], "missingSourceProperties");
          validateNestedProperties(
            properties,
            "target",
            ["id", "type", "tenant"],
            "missingTargetProperties",
          );

          const originInformationProperty = getProperty(properties, "originInformation");
          if (originInformationProperty === undefined) continue;

          const originInformation = originInformationProperty.type;
          if (originInformation.kind !== "Model") {
            context.reportDiagnostic({
              messageId: "missingOriginInformationProperties",
              format: { missing: "relationshipOriginType" },
              target: originInformationProperty,
            });
            continue;
          }

          const missingOriginInformation = getMissingRequiredProperties(originInformation, [
            "relationshipOriginType",
          ]);

          if (missingOriginInformation.length > 0) {
            context.reportDiagnostic({
              messageId: "missingOriginInformationProperties",
              format: { missing: missingOriginInformation.join(", ") },
              target: originInformation,
            });
          }
        }
      },
    };

    function validateNestedProperties(
      properties: Model,
      propertyName: "source" | "target",
      requiredProperties: string[],
      messageId: "missingSourceProperties" | "missingTargetProperties",
    ): void {
      const property = getProperty(properties, propertyName);
      if (property === undefined) return;

      const propertyType = property.type;
      if (propertyType.kind !== "Model") {
        context.reportDiagnostic({
          messageId,
          format: { missing: requiredProperties.join(", ") },
          target: property,
        });
        return;
      }

      const missing = getMissingRequiredProperties(propertyType, requiredProperties);
      if (missing.length > 0) {
        context.reportDiagnostic({
          messageId,
          format: { missing: missing.join(", ") },
          target: propertyType,
        });
      }
    }

    function getMissingRequiredProperties(model: Model, propertyNames: string[]): string[] {
      return propertyNames.filter((propertyName) => {
        const property = getProperty(model, propertyName);
        return property === undefined || property.optional;
      });
    }

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

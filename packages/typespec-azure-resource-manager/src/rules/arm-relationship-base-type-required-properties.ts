import { Model, Program, createRule, getProperty, paramMessage } from "@typespec/compiler";

import { AzureBaseTypeInfo, getAzureBaseTypes } from "../base-types.js";
import { getArmResources } from "../resource.js";

export const armRelationshipBaseTypeRequiredPropertiesRule = createRule({
  name: "arm-relationship-base-type-required-properties",
  severity: "warning",
  description:
    "Resources decorated with @azureBaseType for the Relationship base type must be extension resources and include sourceId, targetId, targetTenant, metadata, and provisioningState properties.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-relationship-base-type-required-properties",
  messages: {
    notExtension: "Relationship resources must be extension resources.",
    missingProperty: paramMessage`Relationship resources must define a required "${"propertyName"}" property.`,
    missingDefinedProperty: paramMessage`Relationship resources must define a "${"propertyName"}" property.`,
    missingMetadataProperty: paramMessage`Relationship metadata must define a required "${"propertyName"}" property.`,
  },
  create(context) {
    return {
      root: (program: Program) => {
        const resources = getArmResources(program);

        for (const resource of resources) {
          const resourceModel = resource.typespecType;
          if (!hasRelationshipBaseType(resourceModel)) continue;

          if (resource.kind !== "Extension") {
            context.reportDiagnostic({
              messageId: "notExtension",
              target: resourceModel,
            });
          }

          const properties = getProperty(resourceModel, "properties")?.type;
          if (properties?.kind !== "Model") {
            continue;
          }

          checkRequiredProperty(properties, "sourceId");
          checkRequiredProperty(properties, "targetId");
          checkRequiredProperty(properties, "targetTenant");
          checkRequiredMetadata(properties);
          checkDefinedProperty(properties, "provisioningState");
        }
      },
    };

    function hasRelationshipBaseType(model: Model): boolean {
      const directTypes = getAzureBaseTypes(context.program, model);
      if (directTypes && isRelationship(directTypes)) return true;

      if (model.sourceModels) {
        for (const source of model.sourceModels) {
          const sourceTypes = getAzureBaseTypes(context.program, source.model);
          if (sourceTypes && isRelationship(sourceTypes)) return true;
        }
      }

      return false;
    }

    function isRelationship(types: AzureBaseTypeInfo[]): boolean {
      return types.some((bt) => bt.baseType === "Relationship");
    }

    function checkRequiredMetadata(properties: Model) {
      const metadata = checkRequiredProperty(properties, "metadata");
      if (metadata === undefined || metadata.optional) return;

      if (metadata.type.kind !== "Model") {
        context.reportDiagnostic({
          messageId: "missingMetadataProperty",
          format: { propertyName: "sourceType" },
          target: metadata,
        });
        return;
      }

      checkRequiredMetadataProperty(metadata.type, "sourceType");
      checkRequiredMetadataProperty(metadata.type, "targetType");
    }

    function checkRequiredMetadataProperty(
      metadata: Model,
      propertyName: "sourceType" | "targetType",
    ) {
      const property = getProperty(metadata, propertyName);
      if (property === undefined || property.optional) {
        context.reportDiagnostic({
          messageId: "missingMetadataProperty",
          format: { propertyName },
          target: metadata,
        });
      }
    }

    function checkRequiredProperty(properties: Model, propertyName: string) {
      const property = getProperty(properties, propertyName);
      if (property === undefined || property.optional) {
        context.reportDiagnostic({
          messageId: "missingProperty",
          format: { propertyName },
          target: properties,
        });
      }
      return property;
    }

    function checkDefinedProperty(properties: Model, propertyName: string) {
      const property = getProperty(properties, propertyName);
      if (property === undefined) {
        context.reportDiagnostic({
          messageId: "missingDefinedProperty",
          format: { propertyName },
          target: properties,
        });
      }
      return property;
    }
  },
});

import {
  ArrayModelType,
  ModelProperty,
  Program,
  createRule,
  getProperty,
  isArrayModelType,
  paramMessage,
} from "@typespec/compiler";
import { getExtensions } from "@typespec/openapi";
import { isArmCommonType } from "../common-types.js";

export const missingXmsIdentifiersRule = createRule({
  name: "missing-x-ms-identifiers",
  description: "Azure services should not use enums.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/missing-x-ms-identifiers",
  messages: {
    default: `Missing identifying properties of objects in the array item, please add @extension("x-ms-identifiers", [<prop>]) to specify it. If there are no appropriate identifying properties, please add @extension("x-ms-identifiers",[]).`,
    notArray: paramMessage`Value passed to @extension("x-ms-identifiers",...) was a "${"valueType"}". Pass an array of property name.`,
    missingProperty: paramMessage`Property "${"propertyName"}" is not found in "${"targetModelName"}". Make sure value of x-ms-identifiers extension are valid property name of the array element.`,
  },
  create(context) {
    return {
      modelProperty: (property: ModelProperty) => {
        const type = property.type;
        if (type.kind === "Model" && isArrayModelType(context.program, type)) {
          if (isArrayMissingIdentifier(context.program, type, property)) {
            context.reportDiagnostic({
              target: property,
            });
          }
        }
      },
    };

    function isArrayMissingIdentifier(
      program: Program,
      array: ArrayModelType,
      property: ModelProperty
    ) {
      const elementType = array.indexer.value;
      if (elementType.kind !== "Model") {
        return false;
      }

      if (isArmCommonType(elementType)) {
        return false;
      }

      if (getProperty(elementType, "id")) {
        return false;
      }

      const xmsIdentifiers = getExtensions(program, property ?? array).get("x-ms-identifiers");
      if (xmsIdentifiers === undefined) {
        return true;
      }

      if (Array.isArray(xmsIdentifiers)) {
        for (const prop of xmsIdentifiers) {
          if (typeof prop === "string") {
            if (!elementType.properties.has(prop)) {
              context.reportDiagnostic({
                messageId: "missingProperty",
                format: { propertyName: prop, targetModelName: elementType.name },
                target: property,
              });
            }
          } else {
            context.reportDiagnostic({
              messageId: "notArray",
              format: { valueType: typeof prop },
              target: property,
            });
          }
        }
      } else {
        context.reportDiagnostic({
          messageId: "notArray",
          format: { valueType: typeof xmsIdentifiers },
          target: property,
        });
      }

      return false;
    }
  },
});

import {
  ModelProperty,
  createRule,
  paramMessage,
} from "@typespec/compiler";

export const missingXmsIdentifiersRule = createRule({
  name: "missing-x-ms-identifiers",
  description: `Array properties should describe their identifying properties with x-ms-identifiers. Decorate the property with @OpenAPI.extension("x-ms-identifiers", #[id-prop])  where "id-prop" is a list of the names of identifying properties in the item type.`,
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/missing-x-ms-identifiers",
  messages: {
    default: `Array property is missing x-ms-identifiers. This extension has been deprecated. Only add if required by legacy OpenAPI consumers.`,
    notArray: paramMessage`Value passed to @OpenAPI.extension("x-ms-identifiers", ...) was a "${"valueType"}". Pass an array of property name.`,
    missingProperty: paramMessage`Property "${"propertyName"}" is not found in "${"targetModelName"}". Make sure value of x-ms-identifiers extension are valid property name of the array element.`,
  },
  create(context) {
    return {
      modelProperty: (property: ModelProperty) => {
        // Rule disabled - x-ms-identifiers is deprecated
        return;
      },
    };
  },
});

import {
  createRule,
  fileRef,
  getDiscriminatedUnionFromInheritance,
  getDiscriminator,
  isTemplateDeclaration,
  type ModelProperty,
  type Type,
} from "@typespec/compiler";
import { walkJsonProperties } from "./model-utils.js";
import { getSourceProperty } from "./utils.js";

export const noNestedSystemDataRule = createRule({
  name: "no-nested-system-data",
  description:
    "System data must be defined in the resource envelope, not inside the properties bag.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-nested-system-data",
  docs: fileRef.fromPackageRoot("src/rules/no-nested-system-data.md"),
  messages: {
    default: "System data must be defined in the resource envelope, not inside the properties bag.",
  },
  create(context) {
    const visited = new Set<Type>();
    const reported = new Set<ModelProperty>();

    function check(type: Type): void {
      if (visited.has(type)) return;
      visited.add(type);

      if (type.kind === "Union") {
        for (const variant of type.variants.values()) {
          check(variant.type);
        }
      } else if (type.kind === "Model") {
        for (const [name, property] of walkJsonProperties(context.program, type)) {
          if (name === "systemData" || name === "SystemData") {
            const target = getSourceProperty(property);
            if (!reported.has(target)) {
              reported.add(target);
              context.reportDiagnostic({ target });
            }
          }
          check(property.type);
        }
        let indexedModel = type;
        while (!indexedModel.indexer && indexedModel.baseModel) {
          indexedModel = indexedModel.baseModel;
        }
        if (indexedModel.indexer) {
          check(indexedModel.indexer.value);
        }
        const discriminator = getDiscriminator(context.program, type);
        if (discriminator) {
          const [alternatives] = getDiscriminatedUnionFromInheritance(
            context.program,
            type,
            discriminator,
          );
          for (const alternative of alternatives.variants.values()) {
            check(alternative);
          }
        }
      }
    }

    return {
      model(model) {
        if (isTemplateDeclaration(model)) return;
        for (const [name, property] of walkJsonProperties(context.program, model)) {
          if (name === "properties") {
            check(property.type);
          }
        }
      },
    };
  },
});

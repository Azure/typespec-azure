import {
  createRule,
  defineCodeFix,
  fileRef,
  getSourceLocation,
  paramMessage,
  resolveEncodedName,
  type CodeFix,
  type Model,
  type ModelProperty,
  type Program,
} from "@typespec/compiler";
import { SyntaxKind } from "@typespec/compiler/ast";

import { getArmResources } from "../resource.js";

export const noTagsOnProxyResourceRule = createRule({
  name: "no-tags-on-proxy-resource",
  docs: fileRef.fromPackageRoot("src/rules/no-tags-on-proxy-resource.md"),
  description:
    "Proxy ARM resources must not declare a tags property on the resource envelope or in their properties bag.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-tags-on-proxy-resource",
  messages: {
    default: paramMessage`Proxy resource '${"resourceName"}' must not declare \`tags\` on its resource envelope or in its properties bag. Use a tracked resource if tags are required.`,
  },
  create(context) {
    return {
      root: () => {
        for (const armResource of getArmResources(context.program)) {
          if (armResource.kind !== "Proxy") {
            continue;
          }

          const resourceTags = getPropertyInHierarchy(
            context.program,
            armResource.typespecType,
            "tags",
          );
          const propertiesModel = getResourcePropertiesModel(
            context.program,
            armResource.typespecType,
          );
          const propertiesTags =
            propertiesModel && getPropertyInHierarchy(context.program, propertiesModel, "tags");

          for (const tagsProperty of [resourceTags, propertiesTags]) {
            if (tagsProperty) {
              const codefix = createRemoveTagsCodeFix(armResource.typespecType, tagsProperty);
              context.reportDiagnostic({
                target: tagsProperty,
                codefixes: codefix ? [codefix] : undefined,
                format: {
                  resourceName: armResource.name,
                },
              });
            }
          }
        }
      },
    };
  },
});

function createRemoveTagsCodeFix(resource: Model, property: ModelProperty): CodeFix | undefined {
  const node = property.node;
  // Avoid editing inherited/copied properties, properties bags, and reusable resource templates.
  if (
    property.model !== resource ||
    property.sourceProperty ||
    node?.kind !== SyntaxKind.ModelProperty ||
    node.parent !== resource.node ||
    (node.parent?.kind === SyntaxKind.ModelStatement && node.parent.templateParameters.length > 0)
  ) {
    return undefined;
  }

  return defineCodeFix({
    id: "remove-proxy-resource-tags",
    label: "Remove tags property",
    fix(context) {
      const location = getSourceLocation(node);
      // Include the separator even when whitespace or comments follow the property type.
      const separator = /^(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*)*[;,]/.exec(
        location.file.text.slice(location.end),
      );
      return context.replaceText(
        { ...location, end: location.end + (separator?.[0].length ?? 0) },
        "",
      );
    },
  });
}

function getResourcePropertiesModel(program: Program, resourceModel: Model): Model | undefined {
  const propertiesProperty = getPropertyInHierarchy(program, resourceModel, "properties");
  return propertiesProperty?.type.kind === "Model" ? propertiesProperty.type : undefined;
}

function getPropertyInHierarchy(
  program: Program,
  model: Model,
  jsonName: string,
): ModelProperty | undefined {
  for (let current: Model | undefined = model; current !== undefined; current = current.baseModel) {
    for (const property of current.properties.values()) {
      if (resolveEncodedName(program, property, "application/json") === jsonName) {
        return property;
      }
    }
  }

  return undefined;
}

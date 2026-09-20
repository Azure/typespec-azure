import {
  createRule,
  fileRef,
  paramMessage,
  resolveEncodedName,
  type CodeFix,
  type Model,
  type ModelProperty,
  type Program,
} from "@typespec/compiler";
import { SyntaxKind } from "@typespec/compiler/ast";

import { createDeletePropertyCodeFix } from "../codefixes/delete-property.js";
import { getArmResources } from "../resource.js";

export const noTagsOnProxyResourceRule = createRule({
  name: "no-tags-on-proxy-resource",
  docs: fileRef.fromPackageRoot("src/rules/no-tags-on-proxy-resource.md"),
  description:
    "Non-tracked ARM resources must not declare a tags property on the resource envelope.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-tags-on-proxy-resource",
  messages: {
    default: paramMessage`Non-tracked resource '${"resourceName"}' must not declare \`tags\` on its resource envelope. Use a tracked resource if ARM tags are required.`,
  },
  create(context) {
    return {
      root: () => {
        for (const armResource of getArmResources(context.program)) {
          if (armResource.kind === "Tracked") {
            continue;
          }

          const resourceTags = getPropertyInHierarchy(
            context.program,
            armResource.typespecType,
            "tags",
          );
          if (resourceTags) {
            const codefix = createRemoveTagsCodeFix(armResource.typespecType, resourceTags);
            context.reportDiagnostic({
              target: resourceTags,
              codefixes: codefix ? [codefix] : undefined,
              format: {
                resourceName: armResource.name,
              },
            });
          }
        }
      },
    };
  },
});

function createRemoveTagsCodeFix(resource: Model, property: ModelProperty): CodeFix | undefined {
  const node = property.node;
  // Avoid editing inherited/copied properties and reusable resource templates.
  if (
    property.model !== resource ||
    property.sourceProperty ||
    node?.kind !== SyntaxKind.ModelProperty ||
    node.parent !== resource.node ||
    (node.parent?.kind === SyntaxKind.ModelStatement && node.parent.templateParameters.length > 0)
  ) {
    return undefined;
  }

  return createDeletePropertyCodeFix(node);
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

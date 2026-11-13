import { defineTypeInfoProvider, getTypeName } from "@typespec/compiler";
import { getParentResource } from "@typespec/rest";
import { resolveResourceOperations } from "./operations.js";
import { getArmResource, getResourceBaseType } from "./resource.js";

/**
 * Contribute resource metadata and operations to IDE hovers and `program.getTypeInfo`.
 */
export const $provideTypeInfo = defineTypeInfoProvider(({ program, target }) => {
  if (target.kind !== "Model") {
    return undefined;
  }
  const resource = getArmResource(program, target);
  if (!resource) {
    return undefined;
  }

  const lines = [
    `\`ARM Resource\`: \`${resource.kind}\``,
    `\`Provider\`: \`${resource.armProviderNamespace}\``,
  ];
  if (resource.collectionName) {
    lines.push(`\`Collection\`: \`${resource.collectionName}\``);
  }
  lines.push(`\`Scope\`: \`${getResourceBaseType(program, target)}\``);

  const parent = getParentResource(program, target);
  if (parent) {
    lines.push(`\`Parent\`: \`${getTypeName(parent)}\``);
  }

  const operations = resolveResourceOperations(program, target);
  const operationLines = [
    ...Object.values(operations.lifecycle),
    ...Object.values(operations.lists),
    ...Object.values(operations.actions),
  ].map(
    (operation) =>
      `- \`${operation.kind}\`: \`${getTypeName(operation.operation)}\` — \`${operation.httpOperation.verb.toUpperCase()} ${operation.httpOperation.uriTemplate}\``,
  );
  if (operationLines.length > 0) {
    lines.push(`Operations:\n${operationLines.join("\n")}`);
  }

  return { content: lines.join("\n\n") };
});

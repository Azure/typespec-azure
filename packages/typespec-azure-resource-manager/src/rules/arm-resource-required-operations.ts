import {
  CodeFix,
  createRule,
  defineCodeFix,
  getSourceLocation,
  Interface,
  Model,
  paramMessage,
  Program,
} from "@typespec/compiler";
import { ArmResourceDetails, getArmResources, isSingletonResource } from "../resource.js";
import { getInterface, getListCategories, isInternalTypeSpec } from "./utils.js";

type RequiredOperation =
  | "read"
  | "createOrUpdate"
  | "delete"
  | "list-by-resource-group"
  | "list-by-subscription"
  | "list-by-parent";

/**
 * Verify that an ARM resource declares the complete set of required
 * lifecycle and list operations for its kind. This rule is singleton-aware
 * and is intended to supersede `no-resource-delete-operation`.
 */
export const armResourceRequiredOperationsRule = createRule({
  name: "arm-resource-required-operations",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-resource-required-operations",
  description:
    "Tracked, proxy, and extension ARM resources must define the complete set of required operations.",
  messages: {
    default: paramMessage`Resource '${"name"}' is missing required operations: [${"operations"}].`,
    missingList: paramMessage`Tracked resource '${"name"}' must have a list-by-resource-group (and list-by-subscription) operation.`,
    missingListByParent: paramMessage`Nested resource '${"name"}' must have a list-by-parent operation.`,
    missingGet: paramMessage`Resource '${"name"}' must have a GET (read) operation.`,
    missingCreateOrUpdate: paramMessage`Resource '${"name"}' must have a PUT (createOrUpdate) operation.`,
    missingDelete: paramMessage`Resource '${"name"}' must have a delete operation.`,
  },
  create(context) {
    return {
      model: (model: Model) => {
        if (isInternalTypeSpec(context.program, model)) return;
        const armResource = getArmResources(context.program).find((r) => r.typespecType === model);
        if (!armResource) return;
        // Skip @armVirtualResource and custom resources entirely.
        if (armResource.kind === "Virtual" || armResource.kind === "Custom") return;

        const required = getRequiredOperationsForResource(context.program, armResource);
        if (required.length === 0) return;
        const present = getPresentOperations(armResource);
        const missing = required.filter((op) => !present.has(op));
        if (missing.length === 0) return;

        const resourceInterface = getInterface(armResource);
        const target = resourceInterface ?? model;

        if (missing.length === 1) {
          const messageId = singleMessageId(missing[0]);
          context.reportDiagnostic({
            messageId,
            target,
            format: { name: armResource.name },
            codefixes: buildCodefixes(missing, armResource.name, resourceInterface),
          });
          return;
        }
        context.reportDiagnostic({
          target,
          format: { name: armResource.name, operations: missing.join(", ") },
          codefixes: buildCodefixes(missing, armResource.name, resourceInterface),
        });
      },
    };
  },
});

function getRequiredOperationsForResource(
  program: Program,
  armResource: ArmResourceDetails,
): RequiredOperation[] {
  const kind = armResource.kind;
  if (kind !== "Tracked" && kind !== "Proxy" && kind !== "Extension") {
    return [];
  }

  const isSingleton = isSingletonResource(program, armResource.typespecType);

  if (kind === "Tracked") {
    if (isSingleton) {
      return ["read", "createOrUpdate"];
    }
    return ["read", "createOrUpdate", "delete", "list-by-resource-group", "list-by-subscription"];
  }

  // Proxy / Extension
  if (isSingleton) {
    return ["read", "createOrUpdate"];
  }
  return ["read", "createOrUpdate", "delete", "list-by-parent"];
}

function getPresentOperations(armResource: ArmResourceDetails): Set<RequiredOperation> {
  const present = new Set<RequiredOperation>();
  const lifecycle = armResource.operations.lifecycle;
  if (lifecycle?.read) present.add("read");
  if (lifecycle?.createOrUpdate) present.add("createOrUpdate");
  if (lifecycle?.delete) present.add("delete");
  const cats = getListCategories(armResource);
  if (cats.bySubscription) present.add("list-by-subscription");
  if (cats.byResourceGroup) present.add("list-by-resource-group");
  if (cats.byParent) present.add("list-by-parent");
  return present;
}

function singleMessageId(
  op: RequiredOperation,
):
  | "missingGet"
  | "missingCreateOrUpdate"
  | "missingDelete"
  | "missingList"
  | "missingListByParent" {
  switch (op) {
    case "read":
      return "missingGet";
    case "createOrUpdate":
      return "missingCreateOrUpdate";
    case "delete":
      return "missingDelete";
    case "list-by-parent":
      return "missingListByParent";
    case "list-by-resource-group":
    case "list-by-subscription":
      return "missingList";
  }
}

function operationTemplate(op: RequiredOperation, resourceName: string): string {
  switch (op) {
    case "read":
      return `read is ArmResourceRead<${resourceName}>;`;
    case "createOrUpdate":
      return `createOrUpdate is ArmResourceCreateOrReplaceAsync<${resourceName}>;`;
    case "delete":
      return `delete is ArmResourceDeleteWithoutOkAsync<${resourceName}>;`;
    case "list-by-resource-group":
      return `listByResourceGroup is ArmResourceListByParent<${resourceName}>;`;
    case "list-by-subscription":
      return `listBySubscription is ArmListBySubscription<${resourceName}>;`;
    case "list-by-parent":
      return `listByParent is ArmResourceListByParent<${resourceName}>;`;
  }
}

function buildCodefixes(
  missing: RequiredOperation[],
  resourceName: string,
  resourceInterface: Interface | undefined,
): CodeFix[] | undefined {
  if (!resourceInterface || !resourceInterface.node) return undefined;
  const node = resourceInterface.node;
  const fixes: CodeFix[] = [];
  for (const op of missing) {
    fixes.push(makeAddOperationFix(op, resourceName, node));
  }
  return fixes;
}

function makeAddOperationFix(
  op: RequiredOperation,
  resourceName: string,
  node: NonNullable<Interface["node"]>,
): CodeFix {
  return defineCodeFix({
    id: `add-${op}-operation`,
    label: `Add ${op} operation declaration`,
    fix: (context) => {
      const sourceLocation = getSourceLocation(node);
      const file = sourceLocation.file;
      // Insert just before the closing `}` of the interface body.
      const insertPos = node.bodyRange.end - 1;
      return context.prependText(
        { file, pos: insertPos },
        `  ${operationTemplate(op, resourceName)}\n`,
      );
    },
  });
}

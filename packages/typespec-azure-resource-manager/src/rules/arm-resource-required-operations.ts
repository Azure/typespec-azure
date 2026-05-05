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
import { resolveArmResources, ResolvedResource } from "../resource.js";
import { isInternalTypeSpec } from "./utils.js";

type RequiredOperation =
  | "read"
  | "createOrUpdate"
  | "delete"
  | "list-by-parent"
  | "list-by-subscription";

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
    missingListBySubscription: paramMessage`Tracked resource '${"name"}' must have a list-by-subscription operation.`,
    missingListByParent: paramMessage`Resource '${"name"}' must have a list-by-parent operation (list-by-resource-group satisfies this for tracked resources).`,
    missingGet: paramMessage`Resource '${"name"}' must have a GET (read) operation.`,
    missingCreateOrUpdate: paramMessage`Resource '${"name"}' must have a PUT (createOrUpdate) operation.`,
    missingDelete: paramMessage`Resource '${"name"}' must have a delete operation.`,
  },
  create(context) {
    // Resolve resources once for the program and reuse for every model visit.
    let resourcesByModel: Map<Model, ResolvedResource[]> | undefined;
    const getResources = (program: Program): Map<Model, ResolvedResource[]> => {
      if (resourcesByModel !== undefined) return resourcesByModel;
      resourcesByModel = new Map();
      const provider = resolveArmResources(program);
      for (const resource of provider.resources ?? []) {
        const list = resourcesByModel.get(resource.type);
        if (list) list.push(resource);
        else resourcesByModel.set(resource.type, [resource]);
      }
      return resourcesByModel;
    };

    return {
      model: (model: Model) => {
        if (isInternalTypeSpec(context.program, model)) return;
        const resources = getResources(context.program).get(model);
        if (!resources || resources.length === 0) return;
        // A resource model can have multiple resolved entries (e.g., distinct
        // operation paths). Treat the union of their operations as the
        // operations declared for this model.
        const armResource = resources[0];
        if (armResource.kind === "Other") return;

        const required = getRequiredOperationsForResource(armResource);
        if (required.length === 0) return;
        const present = getPresentOperations(resources);
        const missing = required.filter((op) => !present.has(op));
        if (missing.length === 0) return;

        const resourceInterface = getResolvedResourceInterface(resources);
        const target = resourceInterface ?? model;

        if (missing.length === 1) {
          const messageId = singleMessageId(missing[0]);
          context.reportDiagnostic({
            messageId,
            target,
            format: { name: armResource.resourceName },
            codefixes: buildCodefixes(missing, armResource.resourceName, resourceInterface),
          });
          return;
        }
        context.reportDiagnostic({
          target,
          format: { name: armResource.resourceName, operations: missing.join(", ") },
          codefixes: buildCodefixes(missing, armResource.resourceName, resourceInterface),
        });
      },
    };
  },
});

function getRequiredOperationsForResource(resource: ResolvedResource): RequiredOperation[] {
  if (resource.kind === "Other") return [];
  const isSingleton = resource.singleton !== undefined;
  if (isSingleton) {
    return ["read", "createOrUpdate"];
  }
  // Every non-singleton resource requires read, createOrUpdate, delete, and a
  // list-by-parent operation. For tracked resources at resource-group scope,
  // list-by-resource-group satisfies the list-by-parent requirement.
  const required: RequiredOperation[] = ["read", "createOrUpdate", "delete", "list-by-parent"];
  if (resource.kind === "Tracked") {
    required.push("list-by-subscription");
  }
  return required;
}

function getPresentOperations(resources: ResolvedResource[]): Set<RequiredOperation> {
  const present = new Set<RequiredOperation>();
  for (const resource of resources) {
    const lifecycle = resource.operations.lifecycle;
    if (lifecycle.read?.length) present.add("read");
    if (lifecycle.createOrUpdate?.length) present.add("createOrUpdate");
    if (lifecycle.delete?.length) present.add("delete");
    for (const op of resource.operations.lists ?? []) {
      const path = op.path ?? "";
      const providersCount = (path.match(/\/providers\//g) ?? []).length;
      if (providersCount > 1) {
        // Nested list-by-parent.
        present.add("list-by-parent");
      } else if (/\/resourceGroups\/\{/.test(path)) {
        // List-by-resource-group satisfies list-by-parent for tracked resources.
        present.add("list-by-parent");
      } else if (/\/subscriptions\/\{/.test(path)) {
        present.add("list-by-subscription");
      }
    }
  }
  return present;
}

function getResolvedResourceInterface(resources: ResolvedResource[]): Interface | undefined {
  for (const resource of resources) {
    for (const ops of Object.values(resource.operations.lifecycle)) {
      if (!Array.isArray(ops)) continue;
      for (const op of ops) {
        if (op.operation.interface) return op.operation.interface;
      }
    }
  }
  return undefined;
}

function singleMessageId(
  op: RequiredOperation,
):
  | "missingGet"
  | "missingCreateOrUpdate"
  | "missingDelete"
  | "missingListByParent"
  | "missingListBySubscription" {
  switch (op) {
    case "read":
      return "missingGet";
    case "createOrUpdate":
      return "missingCreateOrUpdate";
    case "delete":
      return "missingDelete";
    case "list-by-parent":
      return "missingListByParent";
    case "list-by-subscription":
      return "missingListBySubscription";
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
    case "list-by-parent":
      return `listByParent is ArmResourceListByParent<${resourceName}>;`;
    case "list-by-subscription":
      return `listBySubscription is ArmListBySubscription<${resourceName}>;`;
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

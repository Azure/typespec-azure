import {
  CodeFix,
  createRule,
  defineCodeFix,
  getNamespaceFullName,
  getSourceLocation,
  Interface,
  LinterRuleContext,
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

type RequiredOperationsMessages = {
  default: ReturnType<typeof paramMessage>;
  missingListBySubscription: ReturnType<typeof paramMessage>;
  missingListByParent: ReturnType<typeof paramMessage>;
  missingGet: ReturnType<typeof paramMessage>;
  missingCreateOrUpdate: ReturnType<typeof paramMessage>;
  missingDelete: ReturnType<typeof paramMessage>;
};

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
    return {
      // Iterate every resolved ARM resource once for the program. We use
      // `resolveArmResources` (which handles both standard and legacy resource
      // operations) and read kind / singleton / operations directly from the
      // returned ResolvedResource entries.
      //
      // A single declared resource can produce multiple ResolvedResource
      // entries (e.g., when ARM operation templates emit additional paths
      // for createOrUpdate under a nested resource), so entries are grouped
      // by model identity and a single diagnostic is reported per logical
      // resource using the union of their operations.
      root: (program: Program) => {
        const provider = resolveArmResources(program);
        const groups = new Map<Model, ResolvedResource[]>();
        for (const resource of provider.resources ?? []) {
          if (resource.kind === "Other") continue;
          if (isInternalTypeSpec(program, resource.type)) continue;
          // Network Security Perimeter configurations, Private Links, and
          // Private Endpoint Connections have their own well-defined operation
          // shapes and are exempt from this rule.
          if (isExemptCommonTypeResource(resource.type)) continue;
          const list = groups.get(resource.type);
          if (list) list.push(resource);
          else groups.set(resource.type, [resource]);
        }
        for (const entries of groups.values()) {
          checkResource(context, entries);
        }
      },
    };
  },
});

function checkResource(
  context: LinterRuleContext<RequiredOperationsMessages>,
  entries: ResolvedResource[],
): void {
  // Use the entry with the shortest `resourceType.types` as the canonical
  // representation of the resource (it has the natural depth declared by the
  // user). Operations are aggregated across all entries.
  const canonical = entries.reduce((best, cur) =>
    cur.resourceType.types.length < best.resourceType.types.length ? cur : best,
  );

  const required = getRequiredOperationsForResource(canonical);
  if (required.length === 0) return;
  const present = getPresentOperations(entries);
  const missing = required.filter((op) => !present.has(op));
  if (missing.length === 0) return;

  const resourceInterface = getResolvedResourceInterface(entries);
  const target = resourceInterface ?? canonical.type;
  const name = canonical.resourceName;

  if (missing.length === 1) {
    context.reportDiagnostic({
      messageId: singleMessageId(missing[0]),
      target,
      format: { name },
      codefixes: buildCodefixes(missing, name, resourceInterface),
    });
    return;
  }
  context.reportDiagnostic({
    target,
    format: { name, operations: missing.join(", ") },
    codefixes: buildCodefixes(missing, name, resourceInterface),
  });
}

function getRequiredOperationsForResource(resource: ResolvedResource): RequiredOperation[] {
  const isSingleton = resource.singleton !== undefined;
  if (isSingleton) {
    return ["read", "createOrUpdate"];
  }
  // Every non-singleton resource requires read, createOrUpdate, delete, and a
  // list-by-parent operation. For tracked resources at resource-group scope,
  // list-by-resource-group satisfies the list-by-parent requirement.
  const required: RequiredOperation[] = ["read", "createOrUpdate", "delete", "list-by-parent"];
  // list-by-subscription is required only for top-level resource-group-scoped
  // tracked resources (the standard Azure RP pattern). Nested resources
  // (parented under another resource) and tracked resources at non-RG scope
  // (tenant, subscription, location) do not require a list-by-subscription.
  if (resource.kind === "Tracked" && isTopLevelResourceGroupScoped(resource)) {
    required.push("list-by-subscription");
  }
  return required;
}

function isTopLevelResourceGroupScoped(resource: ResolvedResource): boolean {
  if (resource.parent !== undefined) return false;
  const path = resource.resourceInstancePath ?? "";
  return /\/resourceGroups\/\{/.test(path);
}

function getPresentOperations(entries: ResolvedResource[]): Set<RequiredOperation> {
  const present = new Set<RequiredOperation>();
  // Determine the resource kind from the canonical-equivalent: if any entry is
  // tracked, the resource is tracked. (All entries for the same logical model
  // share the same kind in practice.)
  const isTracked = entries.some((e) => e.kind === "Tracked");
  for (const resource of entries) {
    const lifecycle = resource.operations.lifecycle;
    if (lifecycle.read?.length) present.add("read");
    if (lifecycle.createOrUpdate?.length) present.add("createOrUpdate");
    if (lifecycle.delete?.length) present.add("delete");
    for (const op of resource.operations.lists ?? []) {
      const path = op.path ?? "";
      if (!isTracked) {
        // For non-tracked resources (Proxy / Extension), any list operation
        // satisfies the list-by-parent requirement regardless of scope.
        present.add("list-by-parent");
        continue;
      }
      // Tracked resources: list-by-subscription is a list rooted at
      // subscription scope (has /subscriptions/{...} but not
      // /resourceGroups/{...} and no nested /providers/). Everything else
      // (resource-group, location, parent, etc.) counts as list-by-parent.
      const providersCount = (path.match(/\/providers\//g) ?? []).length;
      const hasSubscription = /\/subscriptions\/\{/.test(path);
      const hasResourceGroup = /\/resourceGroups\/\{/.test(path);
      if (hasSubscription && !hasResourceGroup && providersCount <= 1) {
        present.add("list-by-subscription");
      } else {
        present.add("list-by-parent");
      }
    }
  }
  return present;
}

function getResolvedResourceInterface(entries: ResolvedResource[]): Interface | undefined {
  for (const resource of entries) {
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

/**
 * Common-types resource models that have their own well-defined operation
 * shapes and are therefore exempt from the required-operations rule. These
 * are the canonical models in `Azure.ResourceManager.CommonTypes`.
 */
const EXEMPT_COMMON_TYPE_RESOURCES = new Set<string>([
  "PrivateLinkResource",
  "PrivateEndpointConnection",
  "NetworkSecurityPerimeterConfiguration",
]);
const EXEMPT_COMMON_TYPE_NAMESPACE = "Azure.ResourceManager.CommonTypes";

/**
 * Returns true if the given model derives from one of the exempt common-type
 * ARM resource models (NSP configurations, Private Links, Private Endpoint
 * Connections). Walks both `sourceModel` (`is`) and `baseModel` (`extends`)
 * chains.
 */
function isExemptCommonTypeResource(model: Model): boolean {
  const visited = new Set<Model>();
  let current: Model | undefined = model;
  while (current && !visited.has(current)) {
    visited.add(current);
    if (
      EXEMPT_COMMON_TYPE_RESOURCES.has(current.name) &&
      current.namespace !== undefined &&
      getNamespaceFullName(current.namespace) === EXEMPT_COMMON_TYPE_NAMESPACE
    ) {
      return true;
    }
    current = current.sourceModel ?? current.baseModel;
  }
  return false;
}

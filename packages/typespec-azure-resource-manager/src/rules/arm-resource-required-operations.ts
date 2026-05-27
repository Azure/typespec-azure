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
 * and complements `no-resource-delete-operation`.
 */
export const armResourceRequiredOperationsRule = createRule({
  name: "arm-resource-required-operations",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-resource-required-operations",
  description:
    "ARM resources must define their required operations: tracked resources need the full lifecycle and list set, other resources need a read operation.",
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
      // returned ResolvedResource entries. A single resource model may
      // represent multiple actual resources (for example, an extension
      // resource declared at multiple scopes), so each ResolvedResource is
      // validated independently with its own required-operations check, and
      // its diagnostic is targeted at the interface containing the
      // resource's operations.
      root: (program: Program) => {
        const provider = resolveArmResources(program);
        // Path-doubling artifacts: the resolver sometimes emits an extra
        // ResolvedResource for a model whose parent chain loops back to a
        // canonical entry of the same model (typically attributing the
        // `createOrUpdate` operation to that artifact when the resource has
        // a nested child). These are not distinct resources, so collect
        // their operations and merge into the specific canonical ancestor
        // entry they belong to (not by Model, which would incorrectly bleed
        // operations across genuine multi-scope resources).
        const extraPresent = new Map<ResolvedResource, Set<RequiredOperation>>();
        for (const resource of provider.resources ?? []) {
          const canonical = findSelfAncestor(resource);
          if (!canonical) continue;
          const set = extraPresent.get(canonical) ?? new Set();
          for (const op of getPresentOperations(resource)) set.add(op);
          extraPresent.set(canonical, set);
        }
        for (const resource of provider.resources ?? []) {
          if (resource.kind === "Other") continue;
          if (isInternalTypeSpec(program, resource.type)) continue;
          if (findSelfAncestor(resource)) continue;
          // Network Security Perimeter configurations, Private Links, and
          // Private Endpoint Connections have their own well-defined operation
          // shapes and are exempt from this rule.
          if (isExemptCommonTypeResource(resource.type)) continue;
          checkResource(context, resource, extraPresent.get(resource));
        }
      },
    };
  },
});

function checkResource(
  context: LinterRuleContext<RequiredOperationsMessages>,
  resource: ResolvedResource,
  extraPresent: Set<RequiredOperation> | undefined,
): void {
  const required = getRequiredOperationsForResource(resource);
  if (required.length === 0) return;
  const present = getPresentOperations(resource);
  if (extraPresent) for (const op of extraPresent) present.add(op);
  const missing = required.filter((op) => !present.has(op));
  if (missing.length === 0) return;

  const resourceInterface = getResolvedResourceInterface(resource);
  const target = resourceInterface ?? resource.type;
  const name = resource.resourceName;

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
  if (resource.kind === "Tracked") {
    if (isSingleton) {
      return ["read", "createOrUpdate"];
    }
    // Tracked non-singleton resources require the full set of lifecycle and
    // list operations. For resources at resource-group scope,
    // list-by-resource-group satisfies the list-by-parent requirement.
    const required: RequiredOperation[] = ["read", "createOrUpdate", "delete", "list-by-parent"];
    // list-by-subscription is required only for top-level resource-group-scoped
    // tracked resources (the standard Azure RP pattern). Nested tracked
    // resources and tracked resources at non-RG scope (tenant, subscription,
    // location) do not require a list-by-subscription.
    if (isTopLevelResourceGroupScoped(resource)) {
      required.push("list-by-subscription");
    }
    return required;
  }
  // Non-tracked resources (Proxy / Extension) only require a read operation.
  // The "createOrUpdate without delete" condition is enforced separately by
  // the `no-resource-delete-operation` rule.
  return ["read"];
}

function isTopLevelResourceGroupScoped(resource: ResolvedResource): boolean {
  if (resource.parent !== undefined) return false;
  const path = resource.resourceInstancePath ?? "";
  return /\/resourceGroups\/\{/.test(path);
}

/**
 * Returns the closest ancestor ResolvedResource sharing the same model type
 * as the given resource, or undefined if none exists. Used to detect the
 * resolver's path-doubling artifacts (where the model appears as its own
 * ancestor) and to merge their operations into the specific canonical
 * ancestor entry they belong to.
 */
function findSelfAncestor(resource: ResolvedResource): ResolvedResource | undefined {
  const visited = new Set<ResolvedResource>();
  let current = resource.parent;
  while (current && !visited.has(current)) {
    if (current.type === resource.type) return current;
    visited.add(current);
    current = current.parent;
  }
  return undefined;
}

function getPresentOperations(resource: ResolvedResource): Set<RequiredOperation> {
  const present = new Set<RequiredOperation>();
  const isTracked = resource.kind === "Tracked";
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
  return present;
}

function getResolvedResourceInterface(resource: ResolvedResource): Interface | undefined {
  for (const ops of Object.values(resource.operations.lifecycle)) {
    if (!Array.isArray(ops)) continue;
    for (const op of ops) {
      if (op.operation.interface) return op.operation.interface;
    }
  }
  for (const op of resource.operations.lists ?? []) {
    if (op.operation.interface) return op.operation.interface;
  }
  for (const op of resource.operations.actions ?? []) {
    if (op.operation.interface) return op.operation.interface;
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

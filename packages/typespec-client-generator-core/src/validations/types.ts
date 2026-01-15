import {
  Enum,
  EnumMember,
  Interface,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  Program,
  Scalar,
  Type,
  Union,
  UnionVariant,
} from "@typespec/compiler";
import { AugmentDecoratorStatementNode, DecoratorExpressionNode } from "@typespec/compiler/ast";
import { unsafe_Realm } from "@typespec/compiler/experimental";
import { DuplicateTracker } from "@typespec/compiler/utils";
import { getClientNameOverride } from "../decorators.js";
import { SdkClient, TCGCContext } from "../interfaces.js";
import {
  AllScopes,
  clientKey,
  clientLocationKey,
  clientNameKey,
  hasExplicitClientOrOperationGroup,
  listAllUserDefinedNamespaces,
  listScopedDecoratorData,
} from "../internal-utils.js";
import { reportDiagnostic } from "../lib.js";

export function validateTypes(context: TCGCContext) {
  validateClientNames(context);
}

/**
 * Get all service namespaces from multi-service clients.
 * Uses listScopedDecoratorData directly instead of listClients to avoid
 * the cache cleanup that removes empty multi-service clients.
 * Returns empty array if no multi-service clients exist.
 */
function getMultiServiceNamespaces(context: TCGCContext): Namespace[] {
  const namespaceSet = new Set<Namespace>();
  // Directly query @client decorator data to find multi-service clients
  listScopedDecoratorData(context, clientKey).forEach((clientData: SdkClient) => {
    if (clientData.services && clientData.services.length > 1) {
      for (const ns of clientData.services) {
        namespaceSet.add(ns);
      }
    }
  });
  return [...namespaceSet];
}

/**
 * Validate naming with `@clientName` and `@clientLocation` decorators.
 *
 * This function checks for duplicate client names for types considering the impact of `@clientName` for all possible scopes.
 * It also handles the movement of operations to new clients based on the `@clientLocation` decorators.
 * For multi-service clients, it validates names across ALL service namespaces together.
 *
 * @param tcgcContext The context for the TypeSpec Client Generator.
 */
function validateClientNames(tcgcContext: TCGCContext) {
  const languageScopes = getDefinedLanguageScopes(tcgcContext.program);
  // If no `@client` or `@operationGroup` decorators are defined, we consider `@clientLocation`
  const needToConsiderClientLocation = !hasExplicitClientOrOperationGroup(tcgcContext);

  // Detect multi-service scenario
  const multiServiceNamespaces = getMultiServiceNamespaces(tcgcContext);
  const isMultiService = multiServiceNamespaces.length > 0;

  // Ensure we always run validation at least once (with AllScopes) for multi-service scenarios
  // even if no @clientName/@clientLocation decorators are defined
  if (languageScopes.size === 0 && isMultiService) {
    languageScopes.add(AllScopes);
  }

  // Build a map of namespace names to their types for resolving string targets
  const namedNamespaces = new Map<string, Namespace>();
  for (const ns of listAllUserDefinedNamespaces(tcgcContext)) {
    if (ns.name) {
      namedNamespaces.set(ns.name, ns);
    }
  }

  // Check all possible language scopes
  for (const scope of languageScopes) {
    // Gather all moved operations and their targets
    const moved = new Set<Operation>();
    const movedTo = new Map<Namespace | Interface, Operation[]>();
    const newClients = new Map<string, Operation[]>();
    if (needToConsiderClientLocation) {
      // Cache all `@clientName` overrides for the current scope
      for (const [type, target] of listScopedDecoratorData(
        tcgcContext,
        clientLocationKey,
        scope,
      ).entries()) {
        if (unsafe_Realm.realmForType.has(type)) {
          // Skip `@clientName` on versioning types
          continue;
        }
        if (type.kind === "Operation") {
          moved.add(type);
          if (typeof target === "string") {
            // Check if the string target matches an existing namespace
            const existingNamespace = namedNamespaces.get(target);
            if (existingNamespace) {
              // Move to existing namespace referenced by name
              if (!movedTo.has(existingNamespace)) {
                movedTo.set(existingNamespace, [type]);
              } else {
                movedTo.get(existingNamespace)!.push(type);
              }
            } else {
              // Move to new clients (string doesn't match any existing namespace)
              if (!newClients.has(target)) {
                newClients.set(target, [type]);
              } else {
                newClients.get(target)!.push(type);
              }
            }
          } else {
            // Move to existing clients (target is already a Namespace or Interface)
            if (!movedTo.has(target)) {
              movedTo.set(target, [type]);
            } else {
              movedTo.get(target)!.push(type);
            }
          }
        }
      }
    }

    if (isMultiService) {
      // For multi-service: validate types across ALL service namespaces together
      // because they will be generated into the same namespace during multi-service generation.
      // Same-named types across different services will collide.
      validateClientNamesAcrossNamespaces(
        tcgcContext,
        scope,
        moved,
        movedTo,
        multiServiceNamespaces,
      );
    } else {
      // For single-service: existing per-namespace validation
      validateClientNamesPerNamespace(
        tcgcContext,
        scope,
        moved,
        movedTo,
        tcgcContext.program.getGlobalNamespaceType(),
      );
    }

    // Validate client names for new client's operations
    [...newClients.values()].map((operations) => {
      validateClientNamesCore(tcgcContext, scope, operations);
    });
  }
}

function getDefinedLanguageScopes(program: Program): Set<string | typeof AllScopes> {
  const languageScopes = new Set<string | typeof AllScopes>();
  const impacted = [...program.stateMap(clientNameKey).values()];
  impacted.push(...program.stateMap(clientLocationKey).values());
  for (const value of impacted) {
    if (value[AllScopes]) {
      languageScopes.add(AllScopes);
    }
    for (const languageScope of Object.keys(value)) {
      languageScopes.add(languageScope);
    }
  }
  return languageScopes;
}

function* adjustOperations(
  iterator: MapIterator<Operation>,
  moved: Set<Operation>,
  movedTo: Map<Namespace | Interface, Operation[]>,
  container: Namespace | Interface,
): MapIterator<Operation> {
  for (const operation of iterator) {
    if (moved.has(operation)) {
      continue;
    } else {
      yield operation;
    }
  }
  if (movedTo.has(container)) {
    for (const operation of movedTo.get(container)!) {
      yield operation;
    }
  }
}

function validateClientNamesPerNamespace(
  tcgcContext: TCGCContext,
  scope: string | typeof AllScopes,
  moved: Set<Operation>,
  movedTo: Map<Namespace | Interface, Operation[]>,
  namespace: Namespace,
) {
  // Check for duplicate client names for models, enums, and unions
  validateClientNamesCore(tcgcContext, scope, [
    ...namespace.models.values(),
    ...namespace.enums.values(),
    ...namespace.unions.values(),
  ]);

  // Check for duplicate client names for operations
  validateClientNamesCore(
    tcgcContext,
    scope,
    adjustOperations(namespace.operations.values(), moved, movedTo, namespace),
  );

  // check for duplicate client names for operations in interfaces
  for (const item of namespace.interfaces.values()) {
    validateClientNamesCore(
      tcgcContext,
      scope,
      adjustOperations(item.operations.values(), moved, movedTo, item),
    );
  }

  // Check for duplicate client names for interfaces
  validateClientNamesCore(tcgcContext, scope, namespace.interfaces.values());

  // Check for duplicate client names for scalars
  validateClientNamesCore(tcgcContext, scope, namespace.scalars.values());

  // Check for duplicate client names for namespaces
  validateClientNamesCore(tcgcContext, scope, namespace.namespaces.values());

  // Check for duplicate client names for model properties
  for (const model of namespace.models.values()) {
    validateClientNamesCore(tcgcContext, scope, model.properties.values());
  }

  // Check for duplicate client names for enum members
  for (const item of namespace.enums.values()) {
    validateClientNamesCore(tcgcContext, scope, item.members.values());
  }

  // Check for duplicate client names for union variants
  for (const item of namespace.unions.values()) {
    validateClientNamesCore(tcgcContext, scope, item.variants.values());
  }

  // Check for duplicate client names for nested namespaces
  for (const item of namespace.namespaces.values()) {
    validateClientNamesPerNamespace(tcgcContext, scope, moved, movedTo, item);
  }
}

/**
 * Collect all types from a namespace and its nested namespaces recursively.
 */
function collectTypesFromNamespace(
  namespace: Namespace,
  models: Model[],
  enums: Enum[],
  unions: Union[],
  scalars: Scalar[],
) {
  models.push(...namespace.models.values());
  enums.push(...namespace.enums.values());
  unions.push(...namespace.unions.values());
  scalars.push(...namespace.scalars.values());

  // Recursively collect from nested namespaces
  for (const nestedNs of namespace.namespaces.values()) {
    collectTypesFromNamespace(nestedNs, models, enums, unions, scalars);
  }
}

/**
 * Validate client names across multiple service namespaces for multi-service clients.
 * Types with the same name across different services will collide when generated
 * into the same namespace.
 */
function validateClientNamesAcrossNamespaces(
  tcgcContext: TCGCContext,
  scope: string | typeof AllScopes,
  moved: Set<Operation>,
  movedTo: Map<Namespace | Interface, Operation[]>,
  serviceNamespaces: Namespace[],
) {
  // Collect all types from all service namespaces
  const allModels: Model[] = [];
  const allEnums: Enum[] = [];
  const allUnions: Union[] = [];
  const allScalars: Scalar[] = [];

  for (const serviceNs of serviceNamespaces) {
    collectTypesFromNamespace(serviceNs, allModels, allEnums, allUnions, allScalars);
  }

  // Validate models, enums, and unions together across all services
  validateClientNamesCore(tcgcContext, scope, [...allModels, ...allEnums, ...allUnions]);

  // Validate scalars across all services
  validateClientNamesCore(tcgcContext, scope, allScalars);

  // Also validate within each service namespace for operations, interfaces, properties, etc.
  // These are scoped to their containers and don't need cross-service validation
  for (const serviceNs of serviceNamespaces) {
    validateClientNamesPerNamespaceOperationsOnly(tcgcContext, scope, moved, movedTo, serviceNs);
  }
}

/**
 * Validate only operations and their containers within a namespace.
 * Used for multi-service validation where types are validated separately across all services.
 */
function validateClientNamesPerNamespaceOperationsOnly(
  tcgcContext: TCGCContext,
  scope: string | typeof AllScopes,
  moved: Set<Operation>,
  movedTo: Map<Namespace | Interface, Operation[]>,
  namespace: Namespace,
) {
  // Check for duplicate client names for operations
  validateClientNamesCore(
    tcgcContext,
    scope,
    adjustOperations(namespace.operations.values(), moved, movedTo, namespace),
  );

  // Check for duplicate client names for operations in interfaces
  for (const item of namespace.interfaces.values()) {
    validateClientNamesCore(
      tcgcContext,
      scope,
      adjustOperations(item.operations.values(), moved, movedTo, item),
    );
  }

  // Check for duplicate client names for interfaces
  validateClientNamesCore(tcgcContext, scope, namespace.interfaces.values());

  // Check for duplicate client names for namespaces
  validateClientNamesCore(tcgcContext, scope, namespace.namespaces.values());

  // Check for duplicate client names for model properties (within each model)
  for (const model of namespace.models.values()) {
    validateClientNamesCore(tcgcContext, scope, model.properties.values());
  }

  // Check for duplicate client names for enum members (within each enum)
  for (const item of namespace.enums.values()) {
    validateClientNamesCore(tcgcContext, scope, item.members.values());
  }

  // Check for duplicate client names for union variants (within each union)
  for (const item of namespace.unions.values()) {
    validateClientNamesCore(tcgcContext, scope, item.variants.values());
  }

  // Recurse into nested namespaces
  for (const item of namespace.namespaces.values()) {
    validateClientNamesPerNamespaceOperationsOnly(tcgcContext, scope, moved, movedTo, item);
  }
}

function validateClientNamesCore(
  tcgcContext: TCGCContext,
  scope: string | typeof AllScopes,
  items: Iterable<
    | Namespace
    | Scalar
    | Operation
    | Interface
    | Model
    | Enum
    | Union
    | ModelProperty
    | EnumMember
    | UnionVariant
  >,
) {
  const duplicateTracker = new DuplicateTracker<
    string,
    Type | [Type, DecoratorExpressionNode | AugmentDecoratorStatementNode]
  >();

  trackItemsInDuplicateTracker(tcgcContext, scope, items, duplicateTracker);

  reportDuplicateClientNames(tcgcContext.program, duplicateTracker, scope);
}

/**
 * Track items in the duplicate tracker.
 * This is extracted so it can be reused for cross-namespace validation.
 */
function trackItemsInDuplicateTracker(
  tcgcContext: TCGCContext,
  scope: string | typeof AllScopes,
  items: Iterable<
    | Namespace
    | Scalar
    | Operation
    | Interface
    | Model
    | Enum
    | Union
    | ModelProperty
    | EnumMember
    | UnionVariant
  >,
  duplicateTracker: DuplicateTracker<
    string,
    Type | [Type, DecoratorExpressionNode | AugmentDecoratorStatementNode]
  >,
) {
  for (const item of items) {
    const clientName = getClientNameOverride(tcgcContext, item, scope);
    if (clientName !== undefined) {
      const clientNameDecorator = item.decorators.find((x) => x.definition?.name === "@clientName");
      if (clientNameDecorator?.node !== undefined) {
        duplicateTracker.track(clientName, [item, clientNameDecorator.node]);
      }
    } else {
      if (item.name !== undefined && typeof item.name === "string") {
        duplicateTracker.track(item.name, item);
      }
    }
  }
}

function reportDuplicateClientNames(
  program: Program,
  duplicateTracker: DuplicateTracker<
    string,
    Type | [Type, DecoratorExpressionNode | AugmentDecoratorStatementNode]
  >,
  scope: string | typeof AllScopes,
) {
  for (const [name, duplicates] of duplicateTracker.entries()) {
    for (const item of duplicates) {
      const scopeStr = scope === AllScopes ? "AllScopes" : scope;
      if (Array.isArray(item)) {
        // If the item is a decorator application
        if (scope === "csharp" && item[0].kind === "Operation") {
          // .NET support operations with same name with overloads
          reportDiagnostic(program, {
            code: "duplicate-client-name-warning",
            format: { name, scope: scopeStr },
            target: item[1],
          });
        } else {
          reportDiagnostic(program, {
            code: "duplicate-client-name",
            format: { name, scope: scopeStr },
            target: item[1],
          });
        }
      } else {
        if (scope === "csharp" && item.kind === "Operation") {
          // .NET support operations with same name with overloads
          reportDiagnostic(program, {
            code: "duplicate-client-name-warning",
            messageId: "nonDecorator",
            format: { name, scope: scopeStr },
            target: item,
          });
        } else {
          reportDiagnostic(program, {
            code: "duplicate-client-name",
            messageId: "nonDecorator",
            format: { name, scope: scopeStr },
            target: item,
          });
        }
      }
    }
  }
}

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
import { SdkContext, TCGCContext, UsageFlags } from "../interfaces.js";
import {
  AllScopes,
  clientLocationKey,
  clientNameKey,
  hasExplicitClientOrOperationGroup,
  listAllUserDefinedNamespaces,
  listScopedDecoratorData,
} from "../internal-utils.js";
import { reportDiagnostic } from "../lib.js";

export function validateTypes(context: TCGCContext) {
  validateClientNamesWithinNamespaces(context);
}

/**
 * Validate cross-namespace collisions when the --namespace flag is set.
 * This runs in createSdkContext where we have access to sdkPackage and emitter options.
 */
export function validateNamespaceCollisions(context: SdkContext) {
  validateCrossNamespaceClientNames(context);
}

/**
 * Validate basic client name duplicates within namespaces.
 * This checks for duplicate client names for types considering the impact of `@clientName` for all possible scopes.
 * It also handles the movement of operations to new clients based on the `@clientLocation` decorators.
 *
 * This runs in $onValidate and doesn't require SdkContext.
 *
 * @param tcgcContext The TCGC context.
 */
function validateClientNamesWithinNamespaces(tcgcContext: TCGCContext) {
  const languageScopes = getDefinedLanguageScopes(tcgcContext.program);
  // If no `@client` or `@operationGroup` decorators are defined, we consider `@clientLocation`
  const needToConsiderClientLocation = !hasExplicitClientOrOperationGroup(tcgcContext);

  // Ensure we always run validation at least once (with AllScopes)
  if (languageScopes.size === 0) {
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

    // Per-namespace validation for client name duplicates
    validateClientNamesPerNamespace(
      tcgcContext,
      scope,
      moved,
      movedTo,
      tcgcContext.program.getGlobalNamespaceType(),
    );

    // Validate client names for new client's operations
    [...newClients.values()].map((operations) => {
      validateClientNamesCore(tcgcContext, scope, operations);
    });
  }
}

/**
 * Validate cross-namespace collisions when the --namespace flag is set.
 * When namespaces are flattened, types from different namespaces may collide.
 * Also checks for Azure library type conflicts.
 *
 * This requires SdkContext because:
 * 1. Needs access to namespaceFlag emitter option
 * 2. Azure library conflict detection needs sdkPackage to check only used types
 *
 * @param sdkContext The SDK context (includes sdkPackage and emitter options).
 */
function validateCrossNamespaceClientNames(sdkContext: SdkContext) {
  // Check if any Azure library namespace exists (Azure.Core or Azure.ResourceManager)
  const azureLibraryNamespaces = getAzureLibraryNamespaces(sdkContext.program);
  const hasAzureLibrary = azureLibraryNamespaces.length > 0;

  // Only run if there's cross-namespace validation to do:
  // - namespaceFlag is set (types will be flattened)
  // - or Azure library is present (need to check for conflicts)
  if (!sdkContext.namespaceFlag && !hasAzureLibrary) {
    return;
  }

  const languageScopes = getDefinedLanguageScopes(sdkContext.program);

  // Ensure we always run validation at least once (with AllScopes)
  if (languageScopes.size === 0) {
    languageScopes.add(AllScopes);
  }

  // Pre-compute Azure library type names once (O(A) where A = types in Azure libraries)
  // This avoids recomputing for each scope
  let azureTypeNames: Set<string> | undefined;
  if (hasAzureLibrary) {
    azureTypeNames = new Set<string>();
    for (const ns of azureLibraryNamespaces) {
      const names = collectTypeNamesFromNamespace(ns);
      for (const name of names) {
        azureTypeNames.add(name);
      }
    }
  }

  // Pre-compute used types from sdkPackage once (O(U) where U = used types)
  // These are the only types we need to check for Azure library conflicts
  let usedTypes: Set<Type> | undefined;
  if (hasAzureLibrary) {
    usedTypes = new Set<Type>();
    for (const model of sdkContext.sdkPackage.models) {
      if (model.__raw) {
        usedTypes.add(model.__raw);
      }
    }
    for (const enumType of sdkContext.sdkPackage.enums) {
      if (enumType.__raw) {
        usedTypes.add(enumType.__raw);
      }
    }
    for (const unionType of sdkContext.sdkPackage.unions) {
      if (unionType.__raw) {
        usedTypes.add(unionType.__raw);
      }
    }
  }

  // Check all possible language scopes
  for (const scope of languageScopes) {
    // When namespaceFlag is set, validate types across ALL namespaces together
    // because they will be flattened into a single namespace
    if (sdkContext.namespaceFlag) {
      validateClientNamesAcrossAllNamespaces(sdkContext, scope);
    }

    // Check for Azure library type conflicts (only for types actually used by the client)
    if (azureTypeNames !== undefined && usedTypes !== undefined) {
      validateAzureLibraryTypeConflicts(sdkContext, scope, azureTypeNames, usedTypes);
    }
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
  // Collect types from the namespace
  const typesToValidate: (Model | Enum | Union)[] = [
    ...namespace.models.values(),
    ...namespace.enums.values(),
    ...namespace.unions.values(),
  ];

  // Check for duplicate client names for models, enums, and unions
  validateClientNamesCore(tcgcContext, scope, typesToValidate);

  // Check for duplicate client names for scalars
  validateClientNamesCore(tcgcContext, scope, namespace.scalars.values());

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
 * Get Azure library namespaces (Azure.Core and Azure.ResourceManager) if they exist.
 * These are used to detect naming conflicts between user-defined types
 * and built-in Azure library types.
 */
function getAzureLibraryNamespaces(program: Program): Namespace[] {
  const namespaces: Namespace[] = [];
  const globalNs = program.getGlobalNamespaceType();
  const azureNs = globalNs.namespaces.get("Azure");
  if (!azureNs) return namespaces;

  const coreNs = azureNs.namespaces.get("Core");
  if (coreNs) {
    namespaces.push(coreNs);
  }

  const armNs = azureNs.namespaces.get("ResourceManager");
  if (armNs) {
    namespaces.push(armNs);
  }

  return namespaces;
}

/**
 * Collect all type names from a namespace recursively.
 * This includes models, enums, and unions from all nested namespaces.
 */
function collectTypeNamesFromNamespace(namespace: Namespace): Set<string> {
  const names = new Set<string>();

  for (const model of namespace.models.values()) {
    if (model.name) {
      names.add(model.name);
    }
  }
  for (const enumType of namespace.enums.values()) {
    if (enumType.name) {
      names.add(enumType.name);
    }
  }
  for (const union of namespace.unions.values()) {
    if (union.name) {
      names.add(union.name);
    }
  }

  // Recursively collect from nested namespaces
  for (const nestedNs of namespace.namespaces.values()) {
    const nestedNames = collectTypeNamesFromNamespace(nestedNs);
    for (const name of nestedNames) {
      names.add(name);
    }
  }

  return names;
}

/**
 * Validate that user-defined types with @clientName don't conflict with Azure library types.
 * This is a targeted check that only reports conflicts when:
 * 1. A user type has an explicit @clientName decorator
 * 2. The client name matches an Azure library type name (from Azure.Core or Azure.ResourceManager)
 * 3. The type is actually used by the client (present in sdkPackage)
 *
 * This avoids false positives from Azure's own internal type duplicates and unused types.
 *
 * Time complexity: O(U) where U = number of used types in sdkPackage
 * Space complexity: O(1) - only uses pre-computed sets passed in, no new allocations
 */
function validateAzureLibraryTypeConflicts(
  sdkContext: SdkContext,
  scope: string | typeof AllScopes,
  azureTypeNames: Set<string>,
  usedTypes: Set<Type>,
) {
  // Check only used types for conflicts
  for (const userType of usedTypes) {
    if (userType.kind !== "Model" && userType.kind !== "Enum" && userType.kind !== "Union") {
      continue;
    }
    // Only check types that have an explicit @clientName decorator
    const clientName = getClientNameOverride(sdkContext, userType, scope);
    if (clientName !== undefined && azureTypeNames.has(clientName)) {
      // User type with @clientName conflicts with an Azure library type
      const clientNameDecorator = userType.decorators.find(
        (x) => x.definition?.name === "@clientName",
      );
      if (clientNameDecorator?.node !== undefined) {
        const scopeStr = scope === AllScopes ? "AllScopes" : scope;
        reportDiagnostic(sdkContext.program, {
          code: "duplicate-client-name",
          format: { name: clientName, scope: scopeStr },
          target: clientNameDecorator.node,
        });
      }
    }
  }
}

/**
 * Validate client names across all user-defined namespaces when the --namespace flag is set.
 * When namespaces are flattened, types from different namespaces may collide.
 */
function validateClientNamesAcrossAllNamespaces(
  sdkContext: SdkContext,
  scope: string | typeof AllScopes,
) {
  // Collect all types from all user-defined namespaces
  // Note: listAllUserDefinedNamespaces already includes nested namespaces,
  // so we collect types directly from each namespace without recursion
  const allModels: Model[] = [];
  const allEnums: Enum[] = [];
  const allUnions: Union[] = [];

  for (const ns of listAllUserDefinedNamespaces(sdkContext)) {
    // Collect types directly from this namespace (not recursively)
    allModels.push(...ns.models.values());
    allEnums.push(...ns.enums.values());
    allUnions.push(...ns.unions.values());
  }

  // Pre-compute API version enum names to exclude from duplicate name validation
  // API version enums (e.g., "Versions") commonly have the same name across services and that's OK
  // We store names instead of Type references because versioning can create different type instances
  const apiVersionEnumNames = new Set<string>();
  for (const enumType of sdkContext.sdkPackage.enums) {
    if ((enumType.usage & UsageFlags.ApiVersionEnum) !== 0) {
      apiVersionEnumNames.add(enumType.name);
    }
  }

  // Filter out API version enums - they commonly have the same name (e.g., "Versions")
  // across services and that's expected/allowed
  const filteredEnums = allEnums.filter((e) => !e.name || !apiVersionEnumNames.has(e.name));

  // Validate models, enums, and unions together across all namespaces
  validateClientNamesCore(sdkContext, scope, [...allModels, ...filteredEnums, ...allUnions]);
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

  reportDuplicateClientNames(tcgcContext.program, duplicateTracker, scope);
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

import {
  createDiagnosticCollector,
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
import { $ } from "@typespec/compiler/typekit";
import { DuplicateTracker } from "@typespec/compiler/utils";
import { getClientNameOverride } from "../decorators.js";
import { SdkContext, TCGCContext } from "../interfaces.js";
import {
  AllScopes,
  clientLocationKey,
  clientNameKey,
  hasExplicitClientOrOperationGroup,
  listAllUserDefinedNamespaces,
  listScopedDecoratorData,
} from "../internal-utils.js";
import { createDiagnostic, reportDiagnostic } from "../lib.js";

export function validateTypes(context: TCGCContext) {
  validateClientNamesWithinNamespaces(context);
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

/**
 * Validate cross-namespace type name collisions after sdkPackage is built.
 * Handles both:
 * 1. Namespace flag: duplicate type names across namespaces when --namespace flattens them
 * 2. Azure library conflicts: user types with @clientName matching ARM/Core type names
 */
export function validateCrossNamespaceNames(
  sdkContext: SdkContext,
  diagnostics: ReturnType<typeof createDiagnosticCollector>,
) {
  // Part 1: Namespace flag duplicate detection
  if (sdkContext.namespaceFlag) {
    // Exclude version enums from duplicate checking
    const versionEnums = new Set<Enum>();
    for (const [, versionEnum] of sdkContext.getPackageVersionEnum()) {
      if (versionEnum) versionEnums.add(versionEnum);
    }

    const duplicateTracker = new DuplicateTracker<
      string,
      Type | [Type, DecoratorExpressionNode | AugmentDecoratorStatementNode]
    >();

    for (const ns of listAllUserDefinedNamespaces(sdkContext)) {
      for (const type of [
        ...ns.models.values(),
        ...ns.enums.values(),
        ...ns.unions.values(),
        ...ns.interfaces.values(),
      ]) {
        if (!$(sdkContext.program).type.isUserDefined(type)) continue;
        if (type.kind === "Enum" && versionEnums.has(type)) continue;

        const clientName = getClientNameOverride(sdkContext, type, AllScopes);
        if (clientName !== undefined) {
          const decorator = type.decorators.find((x) => x.definition?.name === "@clientName");
          if (decorator?.node !== undefined) {
            duplicateTracker.track(clientName, [type, decorator.node]);
          }
        } else {
          if (type.name !== undefined && typeof type.name === "string") {
            duplicateTracker.track(type.name, type);
          }
        }
      }
    }

    for (const [name, duplicates] of duplicateTracker.entries()) {
      for (const item of duplicates) {
        if (Array.isArray(item)) {
          diagnostics.add(
            createDiagnostic({
              code: "duplicate-client-name",
              format: { name, scope: "AllScopes" },
              target: item[1],
            }),
          );
        } else {
          diagnostics.add(
            createDiagnostic({
              code: "duplicate-client-name",
              messageId: "nonDecorator",
              format: { name, scope: "AllScopes" },
              target: item,
            }),
          );
        }
      }
    }
  }

  // Part 2: Azure library type conflict detection
  const azureLibraryNamespaces = getAzureLibraryNamespaces(sdkContext.program);
  if (azureLibraryNamespaces.length === 0) return;

  const languageScopes = getDefinedLanguageScopes(sdkContext.program);
  if (languageScopes.size === 0) {
    languageScopes.add(AllScopes);
  }

  // Pre-compute Azure library type names
  const azureTypeNames = new Set<string>();
  for (const ns of azureLibraryNamespaces) {
    const names = collectTypeNamesFromNamespace(ns);
    for (const name of names) {
      azureTypeNames.add(name);
    }
  }

  // Pre-compute used types from sdkPackage
  const usedTypes = new Set<Type>();
  for (const model of sdkContext.sdkPackage.models) {
    if (model.__raw) usedTypes.add(model.__raw);
  }
  for (const enumType of sdkContext.sdkPackage.enums) {
    if (enumType.__raw) usedTypes.add(enumType.__raw);
  }
  for (const unionType of sdkContext.sdkPackage.unions) {
    if (unionType.__raw) usedTypes.add(unionType.__raw);
  }

  for (const scope of languageScopes) {
    validateAzureLibraryTypeConflicts(sdkContext, scope, azureTypeNames, usedTypes);
  }
}

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
 */
function collectTypeNamesFromNamespace(namespace: Namespace): Set<string> {
  const names = new Set<string>();

  for (const model of namespace.models.values()) {
    if (model.name) names.add(model.name);
  }
  for (const enumType of namespace.enums.values()) {
    if (enumType.name) names.add(enumType.name);
  }
  for (const union of namespace.unions.values()) {
    if (union.name) names.add(union.name);
  }

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
 * Only reports conflicts when a user type has an explicit @clientName decorator that
 * matches an Azure library type name and the type is actually used by the client.
 */
function validateAzureLibraryTypeConflicts(
  sdkContext: SdkContext,
  scope: string | typeof AllScopes,
  azureTypeNames: Set<string>,
  usedTypes: Set<Type>,
) {
  for (const userType of usedTypes) {
    if (userType.kind !== "Model" && userType.kind !== "Enum" && userType.kind !== "Union") {
      continue;
    }
    const clientName = getClientNameOverride(sdkContext, userType, scope);
    if (clientName !== undefined && azureTypeNames.has(clientName)) {
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



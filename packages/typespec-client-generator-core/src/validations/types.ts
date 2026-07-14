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
import { TCGCContext } from "../interfaces.js";
import {
  AllScopes,
  clientKey,
  clientLocationKey,
  clientNameKey,
  getScopedDecoratorData,
  listScopedDecoratorData,
} from "../internal-utils.js";
import { reportDiagnostic } from "../lib.js";

export function validateTypes(context: TCGCContext) {
  validateClientNames(context);
  validateClientLocationParameterTypes(context);
}

/**
 * Validate naming with `@clientName` and `@clientLocation` decorators.
 *
 * This function checks for duplicate client names for types considering the impact of `@clientName` for all possible scopes.
 * It also handles the movement of operations to new clients based on the `@clientLocation` decorators.
 *
 * @param tcgcContext The context for the TypeSpec Client Generator.
 */
function validateClientNames(tcgcContext: TCGCContext) {
  const languageScopes = getDefinedLanguageScopes(tcgcContext.program);

  // Check all possible language scopes
  for (const scope of languageScopes) {
    // Gather all moved operations and their targets
    const moved = new Set<Operation>();
    const movedTo = new Map<Namespace | Interface, Operation[]>();
    const newClients = new Map<string, Operation[]>();
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
        // Skip operations that belong to an explicit `@client` scoped to a different
        // language than the current scope. Such an operation only exists as a client
        // operation for its own scope (e.g. an `is`-derived operation in a `@client(..., "java")`
        // interface), so it must not be relocated by an inherited `@clientLocation` for other
        // scopes where that client does not apply. Otherwise it would falsely collide with the
        // original operation moved by `@clientLocation`. See https://github.com/Azure/typespec-azure/issues/4850
        if (isClientForOtherScopeOnly(tcgcContext, type.interface ?? type.namespace, scope)) {
          continue;
        }
        moved.add(type);
        if (typeof target === "string") {
          // Move to new clients
          if (!newClients.has(target)) {
            newClients.set(target, [type]);
          } else {
            newClients.get(target)!.push(type);
          }
        } else {
          // Move to existing clients
          if (!movedTo.has(target)) {
            movedTo.set(target, [type]);
          } else {
            movedTo.get(target)!.push(type);
          }
        }
      }
    }

    // Validate client names for the current scope
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
 * Validate that `@clientLocation` does not move parameters with the same name but
 * different types to the same client.
 *
 * When `@clientLocation` is applied to a templated parameter (e.g. on an alias), each
 * operation can instantiate the template with a different type. Moving all of them to the
 * same client produces conflicting client parameters that share a name but differ in type,
 * which results in a broken SDK. We forbid this so the user moves the parameter on each
 * operation instead, keeping a consistent type on the client.
 *
 * @param tcgcContext The context for the TypeSpec Client Generator.
 */
function validateClientLocationParameterTypes(tcgcContext: TCGCContext) {
  const languageScopes = getDefinedLanguageScopes(tcgcContext.program);

  for (const scope of languageScopes) {
    // For each target client (namespace/interface), track the parameters moved under each name.
    const movedByTarget = new Map<Namespace | Interface, Map<string, ModelProperty[]>>();

    for (const [type, target] of listScopedDecoratorData(
      tcgcContext,
      clientLocationKey,
      scope,
    ).entries()) {
      if (unsafe_Realm.realmForType.has(type)) {
        // Skip `@clientLocation` on versioning types
        continue;
      }
      // Only parameters (model properties) moved to an existing client (namespace/interface).
      if (
        type.kind !== "ModelProperty" ||
        typeof target === "string" ||
        (target.kind !== "Namespace" && target.kind !== "Interface")
      ) {
        continue;
      }

      let byName = movedByTarget.get(target);
      if (!byName) {
        byName = new Map<string, ModelProperty[]>();
        movedByTarget.set(target, byName);
      }
      let params = byName.get(type.name);
      if (!params) {
        params = [];
        byName.set(type.name, params);
      }
      params.push(type);
    }

    for (const byName of movedByTarget.values()) {
      for (const [name, params] of byName.entries()) {
        const distinctTypes = new Set<Type>(params.map((p) => p.type));
        if (distinctTypes.size <= 1) {
          continue;
        }
        // Same parameter name moved to the client with conflicting types. Report once per
        // distinct syntax node so a templated parameter that produces several internal copies
        // does not generate duplicate diagnostics.
        const reportedNodes = new Set<unknown>();
        for (const param of params) {
          if (param.node && reportedNodes.has(param.node)) {
            continue;
          }
          reportedNodes.add(param.node);
          reportDiagnostic(tcgcContext.program, {
            code: "client-location-conflict",
            messageId: "parameterTypeConflict",
            format: { parameterName: name },
            target: param,
          });
        }
      }
    }
  }
}

/**
 * Determine whether a container is an explicit `@client` scoped to language(s) that do NOT
 * include the current scope. Such a client (and its operations) only exists for its own scope,
 * so it must be ignored when validating other scopes.
 *
 * This mirrors how the client builder resolves `@client` per scope
 * (see `getScopedDecoratorData(context, clientKey, ...)` in cache.ts), keeping validation
 * consistent with the clients that are actually generated.
 */
function isClientForOtherScopeOnly(
  tcgcContext: TCGCContext,
  container: Namespace | Interface | undefined,
  scope: string | typeof AllScopes,
): boolean {
  // Only relevant for containers explicitly marked as a `@client` for some scope.
  if (container === undefined || !tcgcContext.program.stateMap(clientKey).has(container)) {
    return false;
  }
  // Skip it only when it is not a client for the current scope.
  return getScopedDecoratorData(tcgcContext, clientKey, container, scope) === undefined;
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

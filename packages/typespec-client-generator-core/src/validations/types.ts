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
import {
  AugmentDecoratorStatementNode,
  DecoratorExpressionNode,
  SyntaxKind,
} from "@typespec/compiler/ast";
import { DuplicateTracker } from "@typespec/compiler/utils";
import { getClientNameOverride } from "../decorators.js";
import { TCGCContext } from "../interfaces.js";
import {
  AllScopes,
  clientLocationKey,
  clientNameKey,
  hasExplicitClientOrOperationGroup,
  listScopedDecoratorData,
} from "../internal-utils.js";
import { reportDiagnostic } from "../lib.js";

export function validateTypes(context: TCGCContext) {
  validateClientNames(context);
  validateNoDiscriminatedUnions(context);
}

function validateNoDiscriminatedUnions(context: TCGCContext) {
  if (context.program.stateMap(Symbol.for("TypeSpec.discriminated"))) {
    for (const [type, _] of context.program.stateMap(Symbol.for("TypeSpec.discriminated"))) {
      reportDiagnostic(context.program, {
        code: "no-discriminated-unions",
        target: type,
      });
    }
  }
}

function validateClientNames(tcgcContext: TCGCContext) {
  const languageScopes = getDefinedLanguageScopes(tcgcContext.program);
  const needToConsiderClientLocation = !hasExplicitClientOrOperationGroup(tcgcContext);
  for (const scope of languageScopes) {
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
        if (type.kind === "Operation") {
          moved.add(type);
          if (typeof target === "string") {
            // Move to new clients
            if (!newClients.has(target)) {
              newClients.set(target, [type]);
            } else {
              newClients.get(target)!.push(type);
            }
          } else {
            if (!movedTo.has(target)) {
              movedTo.set(target, [type]);
            } else {
              movedTo.get(target)!.push(type);
            }
          }
        }
      }
    }

    validateClientNamesPerNamespace(
      tcgcContext,
      scope,
      moved,
      movedTo,
      tcgcContext.program.getGlobalNamespaceType(),
    );

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
    Type | DecoratorExpressionNode | AugmentDecoratorStatementNode
  >();

  for (const item of items) {
    const clientName = getClientNameOverride(tcgcContext, item, scope);
    if (clientName !== undefined) {
      const clientNameDecorator = item.decorators.find((x) => x.definition?.name === "@clientName");
      if (clientNameDecorator?.node !== undefined) {
        duplicateTracker.track(clientName, clientNameDecorator.node);
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
    Type | DecoratorExpressionNode | AugmentDecoratorStatementNode
  >,
  scope: string | typeof AllScopes,
) {
  for (const [name, duplicates] of duplicateTracker.entries()) {
    for (const item of duplicates) {
      const scopeStr = scope === AllScopes ? "AllScopes" : scope;
      // If the item is a decorator application node
      if (
        item.kind === SyntaxKind.DecoratorExpression ||
        item.kind === SyntaxKind.AugmentDecoratorStatement
      ) {
        reportDiagnostic(program, {
          code: "duplicate-client-name",
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

import {
  AugmentDecoratorStatementNode,
  DecoratorExpressionNode,
  Enum,
  EnumMember,
  Interface,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  Program,
  Scalar,
  Service,
  Type,
  Union,
  UnionVariant,
} from "@typespec/compiler";
import { DuplicateTracker } from "@typespec/compiler/utils";
import { getClientNameOverride } from "./decorators.js";
import { AllScopes, clientNameKey, createTCGCContext, TCGCContext } from "./internal-utils.js";
import { reportDiagnostic } from "./lib.js";

export function $onValidate(program: Program) {
  const tcgcContext = createTCGCContext(program);
  const languageScopes = getDefinedLanguageScopes(program);
  for (const scope of languageScopes) {
    validateClientNames(program, tcgcContext, scope);
  }
}

function getDefinedLanguageScopes(program: Program): Set<string | typeof AllScopes> {
  const languageScopes = new Set<string | typeof AllScopes>();
  for (const value of program.stateMap(clientNameKey).values()) {
    if (value[AllScopes]) {
      languageScopes.add(AllScopes);
    }
    for (const languageScope of Object.keys(value)) {
      languageScopes.add(languageScope);
    }
  }
  return languageScopes;
}

function validateClientNames(
  program: Program,
  tcgcContext: TCGCContext,
  scope: string | typeof AllScopes
) {
  const services: Service[] = [];
  services.push({ type: program.getGlobalNamespaceType() });

  for (const service of services) {
    validateClientNamesPerNamespace(program, tcgcContext, scope, service.type);
  }
}

function validateClientNamesPerNamespace(
  program: Program,
  tcgcContext: TCGCContext,
  scope: string | typeof AllScopes,
  namespace: Namespace
) {
  // Check for duplicate client names for models, enums, and unions
  validateClientNamesCore(program, tcgcContext, scope, [
    ...namespace.models.values(),
    ...namespace.enums.values(),
    ...namespace.unions.values(),
  ]);

  // Check for duplicate client names for operations
  validateClientNamesCore(program, tcgcContext, scope, namespace.operations.values());

  // Check for duplicate client names for interfaces
  validateClientNamesCore(program, tcgcContext, scope, namespace.interfaces.values());

  // Check for duplicate client names for scalars
  validateClientNamesCore(program, tcgcContext, scope, namespace.scalars.values());

  // Check for duplicate client names for namespaces
  validateClientNamesCore(program, tcgcContext, scope, namespace.namespaces.values());

  // Check for duplicate client names for model properties
  for (const model of namespace.models.values()) {
    validateClientNamesCore(program, tcgcContext, scope, model.properties.values());
  }

  // Check for duplicate client names for enum members
  for (const item of namespace.enums.values()) {
    validateClientNamesCore(program, tcgcContext, scope, item.members.values());
  }

  // Check for duplicate client names for union variants
  for (const item of namespace.unions.values()) {
    validateClientNamesCore(program, tcgcContext, scope, item.variants.values());
  }

  // Check for duplicate client names for nested namespaces
  for (const item of namespace.namespaces.values()) {
    validateClientNamesPerNamespace(program, tcgcContext, scope, item);
  }
}

function validateClientNamesCore(
  program: Program,
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
  >
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

  reportDuplicateClientNames(program, duplicateTracker, scope);
}

function reportDuplicateClientNames(
  program: Program,
  duplicateTracker: DuplicateTracker<
    string,
    Type | DecoratorExpressionNode | AugmentDecoratorStatementNode
  >,
  scope: string | typeof AllScopes
) {
  for (const [name, duplicates] of duplicateTracker.entries()) {
    for (const item of duplicates) {
      const scopeStr = scope === AllScopes ? "AllScopes" : scope;
      // If the item is a decorator application node
      if (item.kind === 5) {
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

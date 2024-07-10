import {
  Enum,
  EnumMember,
  Interface,
  listServices,
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
import { DuplicateTracker } from "@typespec/compiler/utils";
import { getClientNameOverride } from "./decorators.js";
import { AllScopes, createTCGCContext, TCGCContext } from "./internal-utils.js";
import { createStateSymbol, reportDiagnostic } from "./lib.js";

export function $onValidate(program: Program) {
  const tcgcContext = createTCGCContext(program);
  const languageScopes = getDefinedLanguageScopes(program);
  for (const scope of languageScopes) {
    validateClientNames(program, tcgcContext, scope);
  }
}

function getDefinedLanguageScopes(program: Program): Set<string | symbol> {
  const languageScopes = new Set<string | symbol>();
  const stateMap = program.stateMap(createStateSymbol("clientName"));
  for (const value of stateMap.values()) {
    if (value[AllScopes]) {
      languageScopes.add(AllScopes);
    }
    for (const languageScope of Object.keys(value)) {
      languageScopes.add(languageScope);
    }
  }
  return languageScopes;
}

function validateClientNames(program: Program, tcgcContext: TCGCContext, scope: string | symbol) {
  const services = listServices(program);
  for (const service of services) {
    validateClientNamesPerNamespace(program, tcgcContext, scope, service.type);
  }
}

function validateClientNamesPerNamespace(
  program: Program,
  tcgcContext: TCGCContext,
  scope: string | symbol,
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
  scope: string | symbol,
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
  const duplicateTracker = new DuplicateTracker<string, Type>();

  for (const item of items) {
    const clientName = getClientNameOverride(tcgcContext, item, scope);
    const name = clientName ?? item.name;
    if (name !== undefined && typeof name === "string") {
      duplicateTracker.track(name, item);
    }
  }

  reportDuplicateClientNames(program, duplicateTracker, scope);
}

function reportDuplicateClientNames(
  program: Program,
  duplicateTracker: DuplicateTracker<string, Type>,
  scope: string | symbol
) {
  for (const [name, duplicates] of duplicateTracker.entries()) {
    for (const item of duplicates) {
      if (scope === AllScopes) {
        reportDiagnostic(program, {
          code: "duplicate-name",
          format: { name, scope: "AllScopes" },
          target: item,
        });
      } else if (typeof scope === "string") {
        reportDiagnostic(program, {
          code: "duplicate-name",
          format: { name, scope },
          target: item,
        });
      }
    }
  }
}

import type {
  DecoratorContext,
  Interface,
  Namespace,
  Operation,
  Program,
} from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import type { OverrideApiVersionDecorator } from "../../generated-defs/Azure.Core.Legacy.js";
import { AzureCoreStateKeys, reportDiagnostic } from "../lib.js";

const allScopes = Symbol.for("@azure-tools/typespec-azure-core/all-scopes");
const negationScopesKey = Symbol.for("@azure-tools/typespec-azure-core/negation-scopes");

type ScopedApiVersionOverride = Record<PropertyKey, string | string[] | undefined>;

const [getApiVersionOverrideState, setApiVersionOverrideState] = useStateMap<
  Namespace | Interface,
  ScopedApiVersionOverride
>(AzureCoreStateKeys.apiVersionOverride);

export const $overrideApiVersion: OverrideApiVersionDecorator = (
  context: DecoratorContext,
  target: Namespace | Interface,
  version: string,
  scope?: string,
) => {
  if (version.trim().length === 0) {
    reportDiagnostic(context.program, {
      code: "invalid-api-version-override",
      target: context.decoratorTarget,
    });
    return;
  }

  setScopedApiVersionOverride(context.program, target, version, scope);
};

/**
 * Returns the API-version override configured directly on a namespace or interface.
 *
 * @param program The TypeSpec program.
 * @param target The directly decorated namespace or interface.
 * @param scope The emitter language scope, such as `python`.
 */
export function getApiVersionOverride(
  program: Program,
  target: Namespace | Interface,
  scope?: string,
): string | undefined {
  const values = getApiVersionOverrideState(program, target);
  if (values === undefined) {
    return undefined;
  }

  if (scope !== undefined) {
    const normalizedScope = normalizeScope(scope);
    const scopedValue = values[normalizedScope];
    if (typeof scopedValue === "string") {
      return scopedValue;
    }

    const negationScopes = values[negationScopesKey];
    if (Array.isArray(negationScopes) && negationScopes.includes(normalizedScope)) {
      return undefined;
    }
  }

  const defaultValue = values[allScopes];
  return typeof defaultValue === "string" ? defaultValue : undefined;
}

/**
 * Returns the API-version override effective for a namespace, interface, or operation.
 *
 * @param program The TypeSpec program.
 * @param target The namespace, interface, or operation to resolve.
 * @param scope The emitter language scope, such as `python`.
 */
export function getEffectiveApiVersionOverride(
  program: Program,
  target: Namespace | Interface | Operation,
  scope?: string,
): string | undefined {
  let namespace: Namespace | undefined;

  switch (target.kind) {
    case "Namespace":
      namespace = target;
      break;
    case "Interface": {
      const override = getApiVersionOverride(program, target, scope);
      if (override !== undefined) {
        return override;
      }
      namespace = target.namespace;
      break;
    }
    case "Operation": {
      if (target.interface) {
        const override = getApiVersionOverride(program, target.interface, scope);
        if (override !== undefined) {
          return override;
        }
      }
      namespace = target.interface?.namespace ?? target.namespace;
      break;
    }
  }

  while (namespace) {
    const override = getApiVersionOverride(program, namespace, scope);
    if (override !== undefined) {
      return override;
    }
    namespace = namespace.namespace;
  }

  return undefined;
}

function setScopedApiVersionOverride(
  program: Program,
  target: Namespace | Interface,
  version: string,
  scope?: string,
): void {
  const current = getApiVersionOverrideState(program, target) ?? {};
  if (!scope) {
    setApiVersionOverrideState(program, target, { ...current, [allScopes]: version });
    return;
  }

  const [negationScopes, scopes] = parseScopes(scope);
  if (negationScopes.length > 0) {
    const values: ScopedApiVersionOverride = {
      [allScopes]: version,
      [negationScopesKey]: negationScopes,
    };
    for (const language of scopes) {
      values[language] = version;
    }
    for (const language of negationScopes) {
      if (typeof current[language] === "string") {
        values[language] = current[language];
      }
    }
    setApiVersionOverrideState(program, target, values);
    return;
  }

  const values = { ...current };
  for (const language of scopes) {
    values[language] = version;
  }
  setApiVersionOverrideState(program, target, values);
}

function parseScopes(scope: string): [negationScopes: string[], scopes: string[]] {
  const groupedNegation = scope.match(/!\((.*?)\)/);
  if (groupedNegation) {
    return [groupedNegation[1].split(",").map((x) => x.trim()), []];
  }

  const negationScopes: string[] = [];
  const scopes: string[] = [];
  for (const value of scope.split(",").map((x) => x.trim())) {
    if (value.startsWith("!")) {
      negationScopes.push(value.slice(1));
    } else {
      scopes.push(value);
    }
  }
  return [negationScopes, scopes];
}

function normalizeScope(scope: string): string {
  const match = scope.match(/(?:cadl|typespec|client|server)-([^\\/-]*)/);
  if (!match || match.length < 2) {
    return scope;
  }
  return ["typescript", "ts"].includes(match[1]) ? "javascript" : match[1];
}

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

const [getApiVersionOverrideState, setApiVersionOverrideState] = useStateMap<
  Namespace | Interface,
  string
>(AzureCoreStateKeys.apiVersionOverride);

export const $overrideApiVersion: OverrideApiVersionDecorator = (
  context: DecoratorContext,
  target: Namespace | Interface,
  version: string,
) => {
  if (version.trim().length === 0) {
    reportDiagnostic(context.program, {
      code: "invalid-api-version-override",
      target: context.decoratorTarget,
    });
    return;
  }

  setApiVersionOverrideState(context.program, target, version);
};

/**
 * Returns the API-version override configured directly on a namespace or interface.
 *
 * @param program The TypeSpec program.
 * @param target The directly decorated namespace or interface.
 */
export function getApiVersionOverride(
  program: Program,
  target: Namespace | Interface,
): string | undefined {
  return getApiVersionOverrideState(program, target);
}

/**
 * Returns the API-version override effective for a namespace, interface, or operation.
 *
 * @param program The TypeSpec program.
 * @param target The namespace, interface, or operation to resolve.
 */
export function getEffectiveApiVersionOverride(
  program: Program,
  target: Namespace | Interface | Operation,
): string | undefined {
  let namespace: Namespace | undefined;

  switch (target.kind) {
    case "Namespace":
      namespace = target;
      break;
    case "Interface": {
      const override = getApiVersionOverride(program, target);
      if (override !== undefined) {
        return override;
      }
      namespace = target.namespace;
      break;
    }
    case "Operation": {
      if (target.interface) {
        const override = getApiVersionOverride(program, target.interface);
        if (override !== undefined) {
          return override;
        }
      }
      namespace = target.interface?.namespace ?? target.namespace;
      break;
    }
  }

  while (namespace) {
    const override = getApiVersionOverride(program, namespace);
    if (override !== undefined) {
      return override;
    }
    namespace = namespace.namespace;
  }

  return undefined;
}

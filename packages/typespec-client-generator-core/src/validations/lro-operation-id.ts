import { getOperationLinks } from "@azure-tools/typespec-azure-core";
import { listOperationsIn, type ModelProperty } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { isPathParam } from "@typespec/http";
import type { TCGCContext } from "../interfaces.js";
import {
  findRootSourceProperty,
  listAllUserDefinedNamespaces,
  lroOperationIdKey,
} from "../internal-utils.js";
import { reportDiagnostic } from "../lib.js";
import { getHttpOperationWithCache } from "../public-utils.js";

export function validateLroOperationIdTargets(context: TCGCContext): void {
  const targets = context.program.stateMap(lroOperationIdKey);
  if (targets.size === 0) return;

  const validTargets = new Set<ModelProperty>();
  const operations = listAllUserDefinedNamespaces(context).flatMap((namespace) =>
    listOperationsIn(namespace, { recursive: false }),
  );

  for (const operation of operations) {
    const pollingLink = getOperationLinks(context.program, operation)?.get("polling");
    if (!pollingLink) continue;
    const httpOperation = getHttpOperationWithCache(context, pollingLink.linkedOperation);
    for (const parameter of httpOperation.parameters.parameters) {
      if (parameter.type === "path") validTargets.add(findRootSourceProperty(parameter.param));
    }
    // Validate base declarations too, even when a derived monitor overrides them.
    for (
      let model = pollingLink.result?.statusMonitor?.monitorType;
      model;
      model = model.baseModel
    ) {
      for (const property of model.properties.values()) {
        validTargets.add(findRootSourceProperty(property));
      }
    }
  }

  for (const target of targets.keys()) {
    if (target.kind !== "ModelProperty" || isPathParam(context.program, target)) continue;
    if (
      !validTargets.has(findRootSourceProperty(target)) ||
      !$(context.program).scalar.extendsString(target.type)
    ) {
      reportDiagnostic(context.program, {
        code: "lro-operation-id-invalid-target",
        target,
      });
    }
  }
}

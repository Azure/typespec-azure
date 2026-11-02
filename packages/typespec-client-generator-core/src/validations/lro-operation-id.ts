import { getOperationLinks } from "@azure-tools/typespec-azure-core";
import { ignoreDiagnostics, type ModelProperty, type Operation } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { getHttpOperation, isPathParam } from "@typespec/http";
import type { TCGCContext } from "../interfaces.js";
import {
  findRootSourceProperty,
  listAllUserDefinedNamespaces,
  lroOperationIdKey,
} from "../internal-utils.js";
import { reportDiagnostic } from "../lib.js";

export function validateLroOperationIdTargets(context: TCGCContext): void {
  const targets = context.program.stateMap(lroOperationIdKey);
  if (targets.size === 0) return;

  const validTargets = new Set<ModelProperty>();
  const operations = new Set<Operation>();
  for (const namespace of listAllUserDefinedNamespaces(context)) {
    for (const operation of namespace.operations.values()) operations.add(operation);
    for (const iface of namespace.interfaces.values()) {
      for (const operation of iface.operations.values()) operations.add(operation);
    }
  }

  for (const operation of operations) {
    const pollingLink = getOperationLinks(context.program, operation)?.get("polling");
    if (!pollingLink) continue;
    const httpOperation = ignoreDiagnostics(
      getHttpOperation(context.program, pollingLink.linkedOperation),
    );
    for (const parameter of httpOperation.parameters.parameters) {
      if (parameter.type === "path") validTargets.add(findRootSourceProperty(parameter.param));
    }
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

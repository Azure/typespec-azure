import { type LroMetadata, type OperationLink } from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  type Diagnostic,
  ignoreDiagnostics,
  type ModelProperty,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { getHttpOperation } from "@typespec/http";
import { getLroOperationIdDecorators } from "./decorators.js";
import type { TCGCContext } from "./interfaces.js";
import { createDiagnostic } from "./lib.js";

type StatusMonitorLinkStep<TLink> =
  | { kind: "nextOperationLink"; target: TLink }
  | { kind: "nextOperationReference"; target: { link?: TLink } };

/** @internal */
export function getStatusMonitorLink<TLink>(
  statusMonitorStep: StatusMonitorLinkStep<TLink> | undefined,
): TLink | undefined {
  return statusMonitorStep?.kind === "nextOperationLink"
    ? statusMonitorStep.target
    : statusMonitorStep?.target.link;
}

/** @internal */
export function getLroOperationIdLink(
  context: TCGCContext,
  statusMonitorStep: LroMetadata["statusMonitorStep"],
): OperationLink | undefined {
  const link = getStatusMonitorLink(statusMonitorStep);
  if (link?.location !== "Self") return link;
  return $(context.program).scalar.extendsUrl(link.property.type) ? link : undefined;
}

export function resolveLroOperationId(
  context: TCGCContext,
  raw: LroMetadata | undefined,
): [ModelProperty | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  if (!raw) {
    return diagnostics.wrap(undefined);
  }

  const selections = getOperationIdSelections(context, raw);
  if (selections.length > 1) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-operation-id-duplicate",
        target: selections[1].target,
      }),
    );
  }

  let property: ModelProperty | undefined = selections[0]?.property;
  if (property && !getLroOperationIdLink(context, raw.statusMonitorStep)) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-operation-id-missing-link",
        target: selections[0].target,
      }),
    );
    property = undefined;
  }

  return diagnostics.wrap(property);
}

function getOperationIdSelections(context: TCGCContext, raw: LroMetadata) {
  const statusMonitorOperation =
    raw.statusMonitorStep?.kind === "nextOperationReference"
      ? raw.statusMonitorStep.target.operation
      : raw.statusMonitorStep?.operation;
  if (!statusMonitorOperation) return [];

  const httpOperation = ignoreDiagnostics(
    getHttpOperation(context.program, statusMonitorOperation),
  );
  return httpOperation.parameters.parameters.flatMap((parameter) => {
    if (parameter.type !== "path") return [];
    return getLroOperationIdDecorators(context, parameter.param).map((decorator) => ({
      property: parameter.param,
      target: decorator.target,
    }));
  });
}

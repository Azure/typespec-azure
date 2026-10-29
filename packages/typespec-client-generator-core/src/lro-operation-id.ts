import { type LroMetadata, type OperationLink } from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  type Diagnostic,
  type DiagnosticTarget,
  ignoreDiagnostics,
  type Model,
  type ModelProperty,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { getHttpOperation, isVisible, Visibility } from "@typespec/http";
import { getLroOperationIdDecorators, isInScope } from "./decorators.js";
import type { TCGCContext } from "./interfaces.js";
import { hasNoneVisibility } from "./internal-utils.js";
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
): [LroOperationIdSelection[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  if (!raw) {
    return diagnostics.wrap([]);
  }

  const pathSelections = getPathSelections(context, raw);
  if (pathSelections.length > 1) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-operation-id-duplicate",
        target: pathSelections[1].target,
      }),
    );
  }

  const propertySelections = getPropertySelections(context, raw.pollingInfo.responseModel);
  if (propertySelections.length > 1) {
    diagnostics.add(
      createDiagnostic({
        code: "lro-operation-id-duplicate",
        target: propertySelections[1].target,
      }),
    );
  }

  const selections: LroOperationIdSelection[] = [];
  const pathSelection = pathSelections[0];
  if (pathSelection) {
    if (getLroOperationIdLink(context, raw.statusMonitorStep)) {
      selections.push({ kind: "path", property: pathSelection.property });
    } else {
      diagnostics.add(
        createDiagnostic({
          code: "lro-operation-id-missing-link",
          target: pathSelection.target,
        }),
      );
    }
  }
  if (propertySelections[0]) {
    selections.push({ kind: "property", property: propertySelections[0].property });
  }

  return diagnostics.wrap(selections);
}

export type LroOperationIdSelection =
  { kind: "path"; property: ModelProperty } | { kind: "property"; property: ModelProperty };

function getPathSelections(context: TCGCContext, raw: LroMetadata) {
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

function getPropertySelections(context: TCGCContext, responseModel: Model) {
  const selections: { property: ModelProperty; target: DiagnosticTarget }[] = [];
  for (let model: Model | undefined = responseModel; model; model = model.baseModel) {
    for (const property of model.properties.values()) {
      if (
        !isInScope(context, property) ||
        hasNoneVisibility(context, property) ||
        !isVisible(context.program, property, Visibility.Read)
      ) {
        continue;
      }
      selections.push(
        ...getLroOperationIdDecorators(context, property).map((decorator) => ({
          property,
          target: decorator.target,
        })),
      );
    }
  }
  return selections;
}

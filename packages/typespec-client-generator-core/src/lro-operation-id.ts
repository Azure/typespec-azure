import { type LroMetadata, type OperationLink } from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  type Diagnostic,
  type DiagnosticTarget,
  type Model,
  type ModelProperty,
  walkPropertiesInherited,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { isVisible, Visibility } from "@typespec/http";
import { getLroOperationIdDecorator } from "./decorators.js";
import type { TCGCContext } from "./interfaces.js";
import { createDiagnostic } from "./lib.js";
import { getStatusMonitorLink } from "./lro-status-metadata.js";
import { getHttpOperationWithCache } from "./public-utils.js";
import { isVisibleSdkProperty } from "./types.js";

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

  const propertySelections = getPropertySelections(context, raw.pollingInfo.responseModel).filter(
    (selection) => {
      if ($(context.program).scalar.extendsString(selection.property.type)) return true;
      diagnostics.add(
        createDiagnostic({
          code: "lro-operation-id-invalid-target",
          target: selection.target,
        }),
      );
      return false;
    },
  );
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

  const httpOperation = getHttpOperationWithCache(context, statusMonitorOperation);
  return httpOperation.parameters.parameters.flatMap((parameter) => {
    if (parameter.type !== "path") return [];
    const decorator = getLroOperationIdDecorator(context, parameter.param);
    return decorator ? [{ property: parameter.param, target: decorator.target }] : [];
  });
}

function getPropertySelections(context: TCGCContext, responseModel: Model) {
  const selections: { property: ModelProperty; target: DiagnosticTarget }[] = [];
  for (const property of walkPropertiesInherited(responseModel)) {
    if (
      !isVisibleSdkProperty(context, property) ||
      !isVisible(context.program, property, Visibility.Read)
    ) {
      continue;
    }
    const decorator = getLroOperationIdDecorator(context, property);
    if (decorator) {
      selections.push({ property, target: decorator.target });
    }
  }
  return selections;
}

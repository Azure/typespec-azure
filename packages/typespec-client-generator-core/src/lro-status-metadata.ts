import type { LroMetadata } from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  type Diagnostic,
  type ModelProperty,
  walkPropertiesInherited,
} from "@typespec/compiler";
import { getLroStatusMetadataDecorator } from "./decorators.js";
import type { SdkLroStatusMetadata, TCGCContext } from "./interfaces.js";
import { createDiagnostic } from "./lib.js";
import { getSdkModelPropertyType, isVisibleSdkProperty } from "./types.js";

type StatusMonitorLinkStep<TLink> =
  | { kind: "nextOperationLink"; target: TLink }
  | { kind: "nextOperationReference"; target: { link?: TLink } };

function getStatusMonitorLink<TLink>(
  statusMonitorStep: StatusMonitorLinkStep<TLink> | undefined,
): TLink | undefined {
  return statusMonitorStep?.kind === "nextOperationLink"
    ? statusMonitorStep.target
    : statusMonitorStep?.target.link;
}

export function resolveLroStatusMetadata(
  context: TCGCContext,
  raw: LroMetadata,
): [SdkLroStatusMetadata[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const properties: SdkLroStatusMetadata[] = [];

  for (const property of walkPropertiesInherited(raw.pollingInfo.responseModel)) {
    if (!isVisibleSdkProperty(context, property)) continue;
    const metadataDecorator = getLroStatusMetadataDecorator(context, property);
    if (!metadataDecorator) continue;

    const structuralRole = getStructuralRole(raw, property);
    if (structuralRole) {
      diagnostics.add(
        createDiagnostic({
          code: "lro-status-metadata-structural-property",
          format: { propertyName: property.name, role: structuralRole },
          target: metadataDecorator.target,
        }),
      );
      continue;
    }

    properties.push({ property: diagnostics.pipe(getSdkModelPropertyType(context, property)) });
  }

  return diagnostics.wrap(properties);
}

function getStructuralRole(
  raw: LroMetadata,
  property: ModelProperty,
): "status" | "result" | "error" | "location" | undefined {
  if (
    raw.pollingInfo.terminationStatus.kind === "model-property" &&
    raw.pollingInfo.terminationStatus.property === property
  ) {
    return "status";
  }
  if (raw.pollingInfo.resultProperty === property) return "result";
  if (raw.pollingInfo.errorProperty === property) return "error";
  if (getStatusMonitorLink(raw.statusMonitorStep)?.property === property) return "location";

  const finalStep = raw.finalStep;
  if (finalStep?.kind === "finalOperationLink" && finalStep.target.property === property) {
    return "location";
  }
  if (
    finalStep?.kind === "finalOperationReference" &&
    finalStep.target.link?.property === property
  ) {
    return "location";
  }
  return undefined;
}

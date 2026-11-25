import { resolveFindingLocation } from "./pipeline/resolve-location.js";
import type { Finding } from "./types.js";

export interface FindingIdentity {
  primary: string;
  source?: string;
  wire: string;
}

export function getSourceElementPath(finding: Finding): string | undefined {
  return finding.diff.origin?.declarationPath ?? resolveFindingLocation(finding)?.elementPath;
}

export function getFindingIdentity(finding: Finding): FindingIdentity {
  const wire = finding.diff.identity.element;
  const source = getSourceElementPath(finding);
  return {
    primary: source ?? wire,
    source,
    wire,
  };
}

import type { HttpOperationResponse, HttpPayloadBody } from "@typespec/http";

type StatusCode = HttpOperationResponse["statusCodes"];

export function matchesStatusCode(status: StatusCode, expected: number): boolean {
  return typeof status === "object"
    ? status.start === expected && status.end === expected
    : status === expected;
}

export function containsStatusCode(status: StatusCode, expected: number): boolean {
  return typeof status === "object"
    ? status.start <= expected && expected <= status.end
    : status === expected;
}

export function isStatusCodeAllowed(
  status: StatusCode,
  allowed: ReadonlySet<number | "*">,
): boolean {
  return typeof status === "object"
    ? status.start === status.end && allowed.has(status.start)
    : allowed.has(status);
}

export type ResponseBodySelection =
  { kind: "missing" } | { kind: "body"; body: HttpPayloadBody } | { kind: "ambiguous" };

export function selectResponseBody(bodies: Iterable<HttpPayloadBody>): ResponseBodySelection {
  let selected: HttpPayloadBody | undefined;
  for (const body of bodies) {
    if (
      selected !== undefined &&
      (selected.type !== body.type ||
        selected.bodyKind !== body.bodyKind ||
        (selected.bodyKind === "single" &&
          body.bodyKind === "single" &&
          selected.isExplicit !== body.isExplicit))
    ) {
      return { kind: "ambiguous" };
    }
    selected = body;
  }
  return selected === undefined ? { kind: "missing" } : { kind: "body", body: selected };
}

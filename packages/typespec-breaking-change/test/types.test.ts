import { describe, expect, it } from "vitest";
import type {
  ApiDiff,
  DiffKind,
  Finding,
  OperationDiffIdentity,
  OperationIdentity,
  OriginDeclaration,
  ServiceDiffIdentity,
} from "../src/index.js";
import { isOperationIdentity, isServiceIdentity } from "../src/index.js";

describe("core types", () => {
  it("DiffKind can be assigned from string literals", () => {
    const kind: DiffKind = "RequestPropertyRemoved";
    expect(kind).toBe("RequestPropertyRemoved");
  });

  it("OperationIdentity uses normalized path", () => {
    const id: OperationIdentity = {
      method: "GET",
      path: "/subscriptions/{}/resourceGroups/{}/providers/Microsoft.Foo/bars/{}",
      name: "getBars",
    };
    expect(id.method).toBe("GET");
    expect(id.path).toContain("Microsoft.Foo/bars/{}");
  });

  it("OperationDiffIdentity composes OperationIdentity", () => {
    const id: OperationDiffIdentity = {
      operation: { method: "GET", path: "/widgets/{}" },
      component: "request",
      element: "query.filter",
    };
    expect(id.operation.method).toBe("GET");
    expect(id.operation.path).toBe("/widgets/{}");
    expect(id.component).toBe("request");
    expect(id.element).toBe("query.filter");

    const responseId: OperationDiffIdentity = {
      operation: { method: "GET", path: "/widgets/{}" },
      component: "response",
      statusCode: "200",
      element: "body.properties.name",
    };
    expect(responseId.statusCode).toBe("200");
  });

  it("ServiceDiffIdentity represents service-level diffs", () => {
    const serviceDiff: ServiceDiffIdentity = {
      element: "authSchemes.Bearer",
    };
    expect(serviceDiff.element).toBe("authSchemes.Bearer");
  });

  it("OriginDeclaration combines path, type, and source location", () => {
    const origin: OriginDeclaration = {
      declarationPath: "Microsoft.Foo.Models.Widget.tags",
      type: {} as any,
      sourceLocation: { file: {} as any, pos: 100, end: 120 },
    };
    expect(origin.declarationPath).toBe("Microsoft.Foo.Models.Widget.tags");
    expect(origin.type).toBeDefined();
    expect(origin.sourceLocation.pos).toBe(100);
  });

  it("type guards distinguish identity types", () => {
    const opId: OperationDiffIdentity = {
      operation: { method: "GET", path: "/widgets" },
      component: "request",
      element: "query.filter",
    };
    const svcId: ServiceDiffIdentity = { element: "authSchemes.Bearer" };

    expect(isOperationIdentity(opId)).toBe(true);
    expect(isServiceIdentity(opId)).toBe(false);
    expect(isOperationIdentity(svcId)).toBe(false);
    expect(isServiceIdentity(svcId)).toBe(true);
  });

  it("ApiDiff with operation identity and origin", () => {
    const diff: ApiDiff = {
      kind: "ResponsePropertyRemoved",
      identity: {
        operation: { method: "GET", path: "/things/{}", name: "getThing" },
        component: "response",
        statusCode: "200",
        element: "body.properties.legacyStatus",
      },
      origin: {
        declarationPath: "TestService.Models.BarProperties.legacyStatus",
        type: {} as any,
        sourceLocation: { file: {} as any, pos: 100, end: 120 },
      },
      baseSourceLocation: { file: {} as any, pos: 100, end: 120 },
      baseType: {} as any,
      message: "Response property 'legacyStatus' was removed from BarProperties",
    };

    expect(diff.kind).toBe("ResponsePropertyRemoved");
    expect(isOperationIdentity(diff.identity)).toBe(true);
    const opId = diff.identity as OperationDiffIdentity;
    expect(opId.element).toBe("body.properties.legacyStatus");
    expect(opId.operation.method).toBe("GET");
    expect(diff.origin?.declarationPath).toBe("TestService.Models.BarProperties.legacyStatus");
  });

  it("ApiDiff without origin (operation-specific diff)", () => {
    const diff: ApiDiff = {
      kind: "RequestParameterMadeRequired",
      identity: {
        operation: { method: "PUT", path: "/widgets/{}" },
        component: "request",
        element: "query.filter",
      },
      message: "Parameter 'filter' made required",
    };

    expect(diff.origin).toBeUndefined();
    expect(isOperationIdentity(diff.identity)).toBe(true);
  });

  it("ApiDiff with default value change uses Value types", () => {
    const diff: ApiDiff = {
      kind: "DefaultValueChanged",
      identity: {
        operation: { method: "PUT", path: "/widgets/{}" },
        component: "request",
        element: "body.properties.retryCount",
      },
      origin: {
        declarationPath: "TestService.Models.Widget.retryCount",
        type: {} as any,
        sourceLocation: { file: {} as any, pos: 200, end: 210 },
      },
      baseValue: {
        entityKind: "Value",
        valueKind: "NumericValue",
        value: { isInteger: true },
      } as any,
      headValue: {
        entityKind: "Value",
        valueKind: "NumericValue",
        value: { isInteger: true },
      } as any,
      message: "Default value of 'retryCount' changed from 3 to 5",
    };

    expect(diff.baseValue).toBeDefined();
    expect(diff.headValue).toBeDefined();
  });

  it("ApiDiff with service-level identity", () => {
    const diff: ApiDiff = {
      kind: "AuthSchemeRemoved",
      identity: { element: "authSchemes.Bearer" },
      message: "Auth scheme 'Bearer' was removed",
    };

    expect(isServiceIdentity(diff.identity)).toBe(true);
    expect(diff.origin).toBeUndefined();
  });

  it("Finding structure wraps ApiDiff with classification", () => {
    const finding: Finding = {
      diff: {
        kind: "RequestParameterMadeRequired",
        identity: {
          operation: { method: "PUT", path: "/widgets/{}" },
          component: "request",
          element: "query.filter",
        },
        message: "Parameter 'filter' made required",
      },
      severity: "error",
      rule: "RequestParameterMadeRequired",
      phase: "cross-version",
      suppressed: false,
      versionPair: {
        baseVersion: "2024-01-01",
        headVersion: "2025-01-01",
        phase: "cross-version",
      },
    };

    expect(finding.severity).toBe("error");
    expect(finding.suppressed).toBe(false);
    const opId = finding.diff.identity as OperationDiffIdentity;
    expect(opId.element).toBe("query.filter");
    expect(opId.operation.method).toBe("PUT");
  });
});

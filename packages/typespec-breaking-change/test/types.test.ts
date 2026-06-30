import { describe, expect, it } from "vitest";
import type {
  ApiDiff,
  DeclarationIdentity,
  DiffKind,
  Finding,
  OperationDiffIdentity,
  OperationIdentity,
  ServiceDiffIdentity,
} from "../src/index.js";
import { isOperationIdentity, isServiceIdentity } from "../src/index.js";

describe("core types", () => {
  it("DiffKind can be assigned from string literals", () => {
    const kind: DiffKind = "RequestPropertyRemoved";
    expect(kind).toBe("RequestPropertyRemoved");
  });

  it("OperationDiffIdentity represents operation-relative diffs", () => {
    const pathParam: OperationDiffIdentity = {
      operation: "GET /widgets/{widgetId}",
      component: "request",
      element: "path.widgetId",
    };
    expect(pathParam.operation).toBe("GET /widgets/{widgetId}");
    expect(pathParam.component).toBe("request");
    expect(pathParam.element).toBe("path.widgetId");

    const responseProperty: OperationDiffIdentity = {
      operation: "GET /widgets/{widgetId}",
      component: "response",
      statusCode: "200",
      element: "body.properties.name",
    };
    expect(responseProperty.statusCode).toBe("200");
  });

  it("ServiceDiffIdentity represents service-level diffs", () => {
    const serviceDiff: ServiceDiffIdentity = {
      element: "authSchemes.Bearer",
    };
    expect(serviceDiff.element).toBe("authSchemes.Bearer");
  });

  it("DeclarationIdentity represents named type paths", () => {
    const declId: DeclarationIdentity = {
      declarationPath: "Microsoft.Foo.Models.BarProperties.legacyStatus",
    };
    expect(declId.declarationPath).toBe("Microsoft.Foo.Models.BarProperties.legacyStatus");
  });

  it("type guards distinguish identity types", () => {
    const opId: OperationDiffIdentity = {
      operation: "GET /widgets",
      component: "request",
      element: "query.filter",
    };
    const svcId: ServiceDiffIdentity = { element: "authSchemes.Bearer" };

    expect(isOperationIdentity(opId)).toBe(true);
    expect(isServiceIdentity(opId)).toBe(false);
    expect(isOperationIdentity(svcId)).toBe(false);
    expect(isServiceIdentity(svcId)).toBe(true);
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

  it("ApiDiff structure with operation-relative identity", () => {
    const diff: ApiDiff = {
      kind: "ResponsePropertyRemoved",
      identity: {
        operation: "GET /things/{thingId}",
        component: "response",
        statusCode: "200",
        element: "body.properties.legacyStatus",
      },
      declarationIdentity: {
        declarationPath: "TestService.Models.BarProperties.legacyStatus",
      },
      baseSourceLocation: { file: {} as any, pos: 100, end: 120 },
      headSourceLocation: undefined,
      baseType: {} as any,
      headType: undefined,
      details: { propertyPath: "properties.legacyStatus", statusCode: "200" },
      message: "Response property 'legacyStatus' was removed from BarProperties",
      origin: {
        sourceLocation: { file: {} as any, pos: 100, end: 120 },
        type: {} as any,
        declarationName: "legacyStatus",
      },
      affectedOperations: [
        { method: "GET", path: "/things/{}", name: "getThing" },
        { method: "GET", path: "/things", name: "listThings" },
      ],
    };

    expect(diff.kind).toBe("ResponsePropertyRemoved");
    expect(isOperationIdentity(diff.identity)).toBe(true);
    const opId = diff.identity as OperationDiffIdentity;
    expect(opId.element).toBe("body.properties.legacyStatus");
    expect(opId.component).toBe("response");
    expect(diff.declarationIdentity?.declarationPath).toBe(
      "TestService.Models.BarProperties.legacyStatus",
    );
    expect(diff.affectedOperations).toHaveLength(2);
    expect(diff.origin.declarationName).toBe("legacyStatus");
    expect(diff.baseType).toBeDefined();
    expect(diff.headType).toBeUndefined();
    expect(diff.baseValue).toBeUndefined();
    expect(diff.headValue).toBeUndefined();
  });

  it("ApiDiff with default value change uses Value types", () => {
    const diff: ApiDiff = {
      kind: "DefaultValueChanged",
      identity: {
        operation: "PUT /widgets/{id}",
        component: "request",
        element: "body.properties.retryCount",
      },
      declarationIdentity: {
        declarationPath: "TestService.Models.Widget.retryCount",
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
      baseSourceLocation: { file: {} as any, pos: 200, end: 210 },
      headSourceLocation: { file: {} as any, pos: 205, end: 215 },
      baseType: {} as any,
      headType: {} as any,
      details: { propertyPath: "properties.retryCount", baseDefault: 3, headDefault: 5 },
      message: "Default value of 'retryCount' changed from 3 to 5",
      origin: {
        sourceLocation: { file: {} as any, pos: 200, end: 210 },
        type: {} as any,
        declarationName: "retryCount",
      },
      affectedOperations: [{ method: "PUT", path: "/widgets/{}", name: "createWidget" }],
    };

    expect(diff.kind).toBe("DefaultValueChanged");
    expect(diff.baseValue).toBeDefined();
    expect(diff.headValue).toBeDefined();
  });

  it("ApiDiff with service-level identity", () => {
    const diff: ApiDiff = {
      kind: "AuthSchemeRemoved",
      identity: { element: "authSchemes.Bearer" },
      message: "Auth scheme 'Bearer' was removed",
      origin: {
        sourceLocation: { file: {} as any, pos: 10, end: 30 },
        declarationName: "Bearer",
      },
      affectedOperations: [],
    };

    expect(isServiceIdentity(diff.identity)).toBe(true);
    expect(diff.declarationIdentity).toBeUndefined();
  });

  it("Finding structure wraps ApiDiff with classification", () => {
    const finding: Finding = {
      diff: {
        kind: "RequestParameterMadeRequired",
        identity: {
          operation: "PUT /widgets/{id}",
          component: "request",
          element: "query.filter",
        },
        baseSourceLocation: { file: {} as any, pos: 50, end: 80 },
        headSourceLocation: { file: {} as any, pos: 55, end: 85 },
        baseType: {} as any,
        headType: {} as any,
        details: { name: "filter" },
        message: "Parameter 'filter' made required",
        origin: {
          sourceLocation: { file: {} as any, pos: 50, end: 80 },
          declarationName: "filter",
        },
        affectedOperations: [{ method: "PUT", path: "/widgets/{}", name: "createWidget" }],
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
    expect(finding.phase).toBe("cross-version");
    expect(finding.suppressed).toBe(false);
    expect(finding.versionPair.baseVersion).toBe("2024-01-01");
    const opId = finding.diff.identity as OperationDiffIdentity;
    expect(opId.element).toBe("query.filter");
  });
});

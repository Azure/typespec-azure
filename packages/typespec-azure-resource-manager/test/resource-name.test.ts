import type { Model } from "@typespec/compiler";
import { describe, expect, it } from "vitest";
import {
  evaluateResourceNameExpression,
  getDefaultLegacyExtensionResourceName,
  getDefaultLegacyResourceName,
  getResourceNameExpressionModels,
  getStandardResourceNameExpression,
  type ResourceNameExpression,
} from "../src/resource-name.js";

describe("resource name expressions", () => {
  const employee = { name: "Employee" } as Model;
  const connection = { name: "Connection" } as Model;

  it("evaluates explicit, literal, model, and concatenated expressions", () => {
    const expression: ResourceNameExpression = {
      kind: "concat",
      parts: [
        { kind: "explicit", value: "Explicit" },
        { kind: "literal", value: "Literal" },
        { kind: "model", model: employee },
        { kind: "model", model: employee },
      ],
    };

    expect(evaluateResourceNameExpression(expression, "/", (model) => `Client${model.name}`)).toBe(
      "ExplicitLiteralClientEmployeeClientEmployee",
    );
    expect(evaluateResourceNameExpression({ kind: "model", model: employee }, "/")).toBe(
      "Employee",
    );
    expect(getStandardResourceNameExpression(employee, "ExplicitEmployee")).toEqual({
      kind: "explicit",
      value: "ExplicitEmployee",
    });
    expect(getStandardResourceNameExpression(employee, "")).toEqual({
      kind: "model",
      model: employee,
    });
  });

  it("evaluates legacy path algorithms and model fallbacks", () => {
    expect(
      evaluateResourceNameExpression(
        { kind: "legacy-resource", model: employee },
        "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/parents/{parent}/children/{child}",
        (model) => `Client${model.name}`,
      ),
    ).toBe("ParentsChildren");
    expect(
      evaluateResourceNameExpression(
        { kind: "legacy-resource", model: employee },
        "/not-an-arm-resource",
        (model) => `Client${model.name}`,
      ),
    ).toBe("ClientEmployee");
    expect(
      evaluateResourceNameExpression(
        { kind: "legacy-extension", model: connection },
        "/subscriptions/{subscriptionId}/providers/Microsoft.Contoso/parents/{parent}/providers/Microsoft.Contoso/connections/{connection}",
        (model) => `Client${model.name}`,
      ),
    ).toBe("ParentsConnections");
  });

  it("preserves every legacy extension path fallback", () => {
    expect(
      getDefaultLegacyExtensionResourceName(
        "/providers/Microsoft.Contoso/connections/{connection}",
        "Connection",
      ),
    ).toBe("Connections");
    expect(
      getDefaultLegacyExtensionResourceName(
        "//providers/Microsoft.Contoso/connections/{connection}",
        "Connection",
      ),
    ).toBe("Connections");
    expect(getDefaultLegacyExtensionResourceName("/providers", "Connection")).toBe("Connection");
    expect(
      getDefaultLegacyExtensionResourceName(
        "/not-an-arm-path/providers/Microsoft.Contoso/connections/{connection}",
        "Connection",
      ),
    ).toBe("Connection");
    expect(getDefaultLegacyExtensionResourceName("/not-an-arm-path", "Connection")).toBe(
      "Connection",
    );
    expect(
      getDefaultLegacyResourceName(
        "Connection",
        "/providers/Microsoft.Contoso/connections/{connection}",
      ),
    ).toBe("Connections");
  });

  it("collects each contributing model once", () => {
    const expression: ResourceNameExpression = {
      kind: "concat",
      parts: [
        { kind: "explicit", value: "Explicit" },
        { kind: "literal", value: "Literal" },
        { kind: "model", model: employee },
        { kind: "model", model: employee },
        { kind: "legacy-resource", model: connection },
        { kind: "legacy-extension", model: connection },
      ],
    };

    expect([...getResourceNameExpressionModels(expression)]).toEqual([employee, connection]);
  });
});

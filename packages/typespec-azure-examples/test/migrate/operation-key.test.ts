import { describe, expect, it } from "vitest";
import { deriveOperationKey, interfaceOf } from "../../src/migrate/operation-key.js";

describe("deriveOperationKey", () => {
  it("splits Interface_Method and lowercases the method's first letter", () => {
    expect(deriveOperationKey("CaCertificates_Get")).toBe("CaCertificates.get");
  });

  it("only splits on the first underscore", () => {
    expect(deriveOperationKey("CaCertificates_ListByResourceGroup")).toBe(
      "CaCertificates.listByResourceGroup",
    );
  });

  it("returns a bare key when there is no underscore", () => {
    expect(deriveOperationKey("HealthCheck")).toBe("HealthCheck");
  });
});

describe("interfaceOf", () => {
  it("returns the portion before the first dot", () => {
    expect(interfaceOf("CaCertificates.get")).toBe("CaCertificates");
  });

  it("returns the whole key when there is no dot", () => {
    expect(interfaceOf("HealthCheck")).toBe("HealthCheck");
  });
});

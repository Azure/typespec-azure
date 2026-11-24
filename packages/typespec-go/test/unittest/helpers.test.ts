import { describe, expect, it } from "vitest";
import { camelCase, getUniqueVarName } from "../../src/codegen/core/helpers.js";

describe("camelCase", () => {
  it.each([
    ["Creates a DocumentDB cluster", "createsADocumentDBCluster"],
    ["Updates a CosmosDB cluster", "updatesACosmosDBCluster"],
    ["Creates with PremiumSSDv2 storage", "createsWithPremiumSSDv2Storage"],
    ["Creates with PremiumSSD storage", "createsWithPremiumSSDStorage"],
    ["Enables DataAPI and Entra ID", "enablesDataAPIAndEntraID"],
    ["HTTP API request", "httpAPIRequest"],
    ["HTTP", "http"],
    ["Creates a cluster", "createsACluster"],
    ["2 DocumentDB clusters", "twoDocumentDBClusters"],
    ["creates_a-cluster", "createsACluster"],
    [" Creates a DocumentDB cluster. ", "createsADocumentDBCluster"],
    ["", ""],
  ])("converts %j to %j", (input, expected) => {
    expect(camelCase(input)).toBe(expected);
  });
});

describe("getUniqueVarName", () => {
  it("uses the first available candidate", () => {
    expect(getUniqueVarName([], ["resp", "response"])).toBe("resp");
    expect(getUniqueVarName([{ name: "resp" }], ["resp", "response"])).toBe("response");
  });

  it("suffixes the last candidate when all candidates collide", () => {
    expect(getUniqueVarName([{ name: "resp" }, { name: "response" }], ["resp", "response"])).toBe(
      "response0",
    );
  });

  it("skips occupied suffixes", () => {
    expect(
      getUniqueVarName(
        [{ name: "resp" }, { name: "response" }, { name: "response0" }, { name: "response1" }],
        ["resp", "response"],
      ),
    ).toBe("response2");
  });

  it("supports a single candidate", () => {
    expect(getUniqueVarName([{ name: "resp" }], ["resp"])).toBe("resp0");
  });
});

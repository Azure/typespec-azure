import { resolvePath } from "@typespec/compiler";
import { createTester, t } from "@typespec/compiler/testing";
import type { HttpOperationBody, HttpPayloadBody } from "@typespec/http";
import { describe, expect, it } from "vitest";
import {
  containsStatusCode,
  isStatusCodeAllowed,
  matchesStatusCode,
  selectResponseBody,
} from "../../src/rules/http-response-utils.js";

describe("HTTP response status primitives", () => {
  it("matches literals and singleton ranges exactly", () => {
    expect(matchesStatusCode(200, 200)).toBe(true);
    expect(matchesStatusCode({ start: 200, end: 200 }, 200)).toBe(true);
    expect(matchesStatusCode({ start: 200, end: 202 }, 200)).toBe(false);
    expect(matchesStatusCode("*", 200)).toBe(false);
    expect(matchesStatusCode(201, 200)).toBe(false);
  });

  describe("HTTP response body selection", () => {
    it("distinguishes identical and ambiguous body variants independently of their order", async () => {
      const { First: first, Second: second } = await createTester(
        resolvePath(import.meta.dirname, "../.."),
        {
          libraries: [],
        },
      ).compile(
        t.code`model ${t.model("First")} { value: string; } model ${t.model("Second")} { other: string; }`,
      );
      const json: HttpOperationBody = {
        bodyKind: "single",
        type: first,
        isExplicit: true,
        containsMetadataAnnotations: false,
        contentTypes: ["application/json"],
      };
      const xml = { ...json, contentTypes: ["application/xml"] };
      expect(selectResponseBody([json])).toEqual({ kind: "body", body: json });
      expect(selectResponseBody([json, xml])).toEqual({ kind: "body", body: xml });
      const alternatives: HttpPayloadBody[] = [
        { ...xml, type: second },
        { ...xml, isExplicit: false },
        { bodyKind: "file", type: first, isText: true, contentTypes: ["text/plain"] },
      ];
      for (const alternative of alternatives) {
        expect(selectResponseBody([json, alternative])).toEqual({ kind: "ambiguous" });
        expect(selectResponseBody([alternative, json])).toEqual({ kind: "ambiguous" });
      }
    });
  });

  it("distinguishes containment from exact matching", () => {
    expect(containsStatusCode({ start: 200, end: 202 }, 201)).toBe(true);
    expect(containsStatusCode({ start: 200, end: 202 }, 204)).toBe(false);
    expect(containsStatusCode(200, 200)).toBe(true);
    expect(containsStatusCode("*", 200)).toBe(false);
  });

  it("checks allowed entries without treating ranges as discrete alternatives", () => {
    const allowed = new Set<number | "*">([200, 202, "*"]);
    expect(isStatusCodeAllowed(200, allowed)).toBe(true);
    expect(isStatusCodeAllowed("*", allowed)).toBe(true);
    expect(isStatusCodeAllowed({ start: 202, end: 202 }, allowed)).toBe(true);
    expect(isStatusCodeAllowed({ start: 200, end: 202 }, allowed)).toBe(false);
    expect(isStatusCodeAllowed({ start: 201, end: 201 }, allowed)).toBe(false);
  });

  it("distinguishes missing response bodies", () => {
    expect(selectResponseBody([])).toEqual({ kind: "missing" });
  });
});

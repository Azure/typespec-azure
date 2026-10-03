import { SyntaxKind } from "@typespec/compiler/ast";
import { expectCodeFixOnAst } from "@typespec/compiler/testing";
import { ok, strictEqual } from "node:assert";
import { describe, it } from "vitest";
import { createDeletePropertyCodeFix } from "../../src/codefixes/delete-property.js";

describe("delete property", () => {
  it.each([";", ",", " /* comment; , */;", " // comment; ,\n;", " // comment; ,\r\n,"])(
    "deletes a property and its separator: %j",
    async (separator) => {
      await expectCodeFixOnAst(
        `model Example { \u2506value: string${separator} next: string; }`,
        (node) => {
          const property = node.parent;
          ok(property);
          strictEqual(property.kind, SyntaxKind.ModelProperty);
          return createDeletePropertyCodeFix(property);
        },
      ).toChangeTo("model Example {  next: string; }");
    },
  );

  it.each([
    " /* first */",
    " // keep; comment\n",
    " // keep, comment\r\n",
    ` //${"//".repeat(10_000)}\n`,
    ` /*${"*//*".repeat(10_000)}*/`,
  ])("preserves trailing trivia without a separator (case %#)", async (trivia) => {
    await expectCodeFixOnAst(
      `model Example { \u2506value: string${trivia}}\nmodel Other { value: string /* second */; }`,
      (node) => {
        const property = node.parent;
        ok(property);
        strictEqual(property.kind, SyntaxKind.ModelProperty);
        return createDeletePropertyCodeFix(property);
      },
    ).toChangeTo(`model Example { ${trivia}}\nmodel Other { value: string /* second */; }`);
  });
});

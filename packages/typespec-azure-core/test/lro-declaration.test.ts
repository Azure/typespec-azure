import { t } from "@typespec/compiler/testing";
import { strictEqual } from "node:assert";
import { it } from "vitest";
import { isLroDeclared, setLroDeclaration } from "../src/lro-declaration.js";
import { Tester } from "./test-host.js";

it("resolves current declarations using the queried program, operation and consumer", async () => {
  const { program, read: operation } = await Tester.compile(t.code`
    @service namespace Test;
    @get @route("/read") op ${t.op("read")}(): { value: string; };
  `);
  let enabled = false;
  setLroDeclaration(program, operation, (queriedProgram, queriedOperation, consumer) => {
    strictEqual(queriedProgram, program);
    strictEqual(queriedOperation, operation);
    return enabled && consumer === "@azure-tools/typespec-autorest";
  });
  strictEqual(isLroDeclared(program, operation, "@azure-tools/typespec-autorest"), false);
  enabled = true;
  strictEqual(isLroDeclared(program, operation, "@azure-tools/typespec-autorest"), true);
  strictEqual(isLroDeclared(program, operation, "@azure-tools/typespec-java"), false);

  const other = await Tester.compile(t.code`
    @service namespace Test;
    @get @route("/read") op ${t.op("read")}(): { value: string; };
  `);
  strictEqual(isLroDeclared(other.program, other.read, "@azure-tools/typespec-autorest"), false);
});

import { createLinterRuleTester } from "@typespec/compiler/testing";
import { it, vi } from "vitest";
import { useDeleteForDeleteRule } from "../src/rules/use-delete-for-delete.js";
import { SimpleTester } from "./tester.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});

it("runs native DELETE naming without loading the AutoRest emitter", async () => {
  const tester = createLinterRuleTester(
    await SimpleTester.createInstance(),
    useDeleteForDeleteRule,
    "@azure-tools/typespec-client-generator-core",
  );
  await tester
    .expect(
      `
    @service namespace Example;
    @delete @route("/widgets/{id}")
    op deleteWidget(@path id: string): void;
  `,
    )
    .toBeValid();
});

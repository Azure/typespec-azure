import { Operation } from "@typespec/compiler";
import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { getDocHelper } from "../src/internal-utils.js";
import { SdkTestRunner, createSdkTestRunner } from "./test-host.js";

describe("typespec-client-generator-core: internal-utils", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });
  describe("getDocHelper", () => {
    it("no doc or summary", async () => {
      const { func } = (await runner.compile(`
        @test op func(@query("api-version") myApiVersion: string): void;
      `)) as { func: Operation };
      const docHelper = getDocHelper(runner.context, func);
      strictEqual(docHelper.description, undefined);
      strictEqual(docHelper.details, undefined);
    });
    it("just doc", async () => {
      const { func } = (await runner.compile(`
        @test
        @doc("This is a description")
        op func(@query("api-version") myApiVersion: string): void;
      `)) as { func: Operation };
      const docHelper = getDocHelper(runner.context, func);
      strictEqual(docHelper.description, "This is a description");
      strictEqual(docHelper.details, undefined);
    });
    it("just summary", async () => {
      const { func } = (await runner.compile(`
        @test
        @summary("This is a summary")
        op func(@query("api-version") myApiVersion: string): void;
      `)) as { func: Operation };
      const docHelper = getDocHelper(runner.context, func);
      strictEqual(docHelper.description, "This is a summary");
      strictEqual(docHelper.details, undefined);
    });
    it("doc and summary", async () => {
      const { func } = (await runner.compile(`
        @test
        @doc("This is a description")
        @summary("This is a summary")
        op func(@query("api-version") myApiVersion: string): void;
      `)) as { func: Operation };
      const docHelper = getDocHelper(runner.context, func);
      strictEqual(docHelper.description, "This is a summary");
      strictEqual(docHelper.details, "This is a description");
    });
  });
  describe("parseEmitterName", () => {
    it("@azure-tools/typespec-{language}", async () => {
      const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
      await runner.compile("");
      strictEqual(runner.context.emitterName, "csharp");
    });

    it("@typespec/{protocol}-{client|server}-{language}-generator", async () => {
      const runner = await createSdkTestRunner({ emitterName: "@typespec/http-client-csharp" });
      await runner.compile("");
      strictEqual(runner.context.emitterName, "csharp");
    });
  });
});

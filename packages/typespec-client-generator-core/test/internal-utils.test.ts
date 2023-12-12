import {
  Operation,
} from "@typespec/compiler";
import { deepStrictEqual, ok, strictEqual } from "assert";
import {
  getDocHelper
} from "../src/internal-utils.js";
import {
  createSdkTestRunner,
  SdkTestRunner,
} from "./test-host.js";

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
});

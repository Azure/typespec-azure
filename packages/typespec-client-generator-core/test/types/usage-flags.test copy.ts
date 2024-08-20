import { beforeEach, describe, it } from "vitest";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";
import { strictEqual } from "assert";

describe("typespec-client-generator-core: doc and summary", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  it("unicode", async () => {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      @doc("测试doc")
      @summary("测试summary")
      model Test {}
      `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].doc, "测试doc");
    strictEqual(models[0].summary, "测试summary");
  });
});

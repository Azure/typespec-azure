import { strictEqual } from "assert";
import { it } from "vitest";
import { createSdkContextForTester, SimpleTesterWithBuiltInService } from "../tester.js";

it("unicode", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    @usage(Usage.input | Usage.output)
    @doc("测试doc")
    @summary("测试summary")
    model Test {}
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 1);
  strictEqual(models[0].doc, "测试doc");
  strictEqual(models[0].summary, "测试summary");
});

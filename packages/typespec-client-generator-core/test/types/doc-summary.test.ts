import { strictEqual } from "assert";
import { it } from "vitest";
import { createSdkContextForTester, SimpleTesterWithService } from "../tester.js";

it("unicode", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    @doc("测试doc")
    @summary("测试summary")
    model Test {}
  `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 1);
  strictEqual(models[0].doc, "测试doc");
  strictEqual(models[0].summary, "测试summary");
});

import { strictEqual } from "assert";
import { it } from "vitest";
import { createSdkContextForTester, SimpleTesterWithService } from "../tester.js";
import { getSdkTypeHelper } from "./utils.js";

it("string", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      prop: "json";
    }
  `);

  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "constant");
  strictEqual(sdkType.valueType.kind, "string");
  strictEqual(sdkType.value, "json");
  strictEqual(sdkType.name, "TestProp");
  strictEqual(sdkType.isGeneratedName, true);
});
it("boolean", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      @test prop: true;
    }
  `);

  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "constant");
  strictEqual(sdkType.valueType.kind, "boolean");
  strictEqual(sdkType.value, true);
  strictEqual(sdkType.name, "TestProp");
  strictEqual(sdkType.isGeneratedName, true);
});
it("number", async function () {
  const { program } = await SimpleTesterWithService.compile(`
    @usage(Usage.input | Usage.output)
    model Test {
      @test prop: 4;
    }
  `);

  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "constant");
  strictEqual(sdkType.valueType.kind, "int32");
  strictEqual(sdkType.value, 4);
  strictEqual(sdkType.name, "TestProp");
  strictEqual(sdkType.isGeneratedName, true);
});

import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { createSdkContextForTester, SimpleTester } from "../tester.js";

it("model with tupled properties", async function () {
  const { program } = await SimpleTester.compile(`
    @service
    namespace MyService;
    @usage(Usage.input | Usage.output)
    model MyFlow {
      scopes: ["https://security.microsoft.com/.default"];
      test: [int32, string]
    }
  `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 1);
  const scopes = models[0].properties.find((x) => x.name === "scopes");
  ok(scopes);
  strictEqual(scopes.type.kind, "tuple");
  strictEqual(scopes.type.valueTypes[0].kind, "constant");
  strictEqual(scopes.type.valueTypes[0].valueType.kind, "string");
  strictEqual(scopes.type.valueTypes[0].value, "https://security.microsoft.com/.default");
  const test = models[0].properties.find((x) => x.name === "test");
  ok(test);
  strictEqual(test.type.kind, "tuple");
  strictEqual(test.type.valueTypes[0].kind, "int32");
  strictEqual(test.type.valueTypes[1].kind, "string");
});

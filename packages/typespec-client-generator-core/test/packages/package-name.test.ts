import { strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});
it("as config option", async () => {
  const runnerWithPackageName = await createSdkTestRunner({
    "package-name": "My.Package.Name",
  });
  await runnerWithPackageName.compile(`
      @client({name: "MyClient"})
      @service
      namespace Not.My.Package.Name;
    `);

  strictEqual(runnerWithPackageName.context.sdkPackage.name, "My.Package.Name");
});
it("from namespace", async () => {
  await runner.compile(`
      @client({name: "MyClient"})
      @service
      namespace My.Package.Name;
    `);

  strictEqual(runner.context.sdkPackage.name, "My.Package.Name");
});

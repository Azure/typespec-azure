import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getServiceMethodOfClient } from "./utils.js";

describe("parameters", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  it("isOverride false", async () => {
    await runner.compileWithBuiltInService(`
      op test(): void;
    `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.isOverride, false);
  });

  it("isOverride true", async () => {
    await runner.compileWithBuiltInService(`
      model TestOptions {
        @query a: string;
        @query b: string;
      }

      op test(...TestOptions): void;

      op testOverride(options: TestOptions): void;

      @@override(test, testOverride);
    `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.isOverride, true);
  });
});

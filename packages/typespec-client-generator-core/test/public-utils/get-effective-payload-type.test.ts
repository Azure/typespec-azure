import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { getDefaultApiVersion } from "../../src/public-utils.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";
import { getServiceNamespace } from "../utils.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});
it("get single", async () => {
  await runner.compile(`
      enum Versions {
        v2022_01_01: "2022-01-01",
      }

      @versioned(Versions)
      @service
      namespace MyService {};
    `);
  const serviceNamespace = getServiceNamespace(runner);
  const defaultApiVersion = getDefaultApiVersion(runner.context, serviceNamespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "2022-01-01");
});

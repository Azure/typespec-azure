import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { getDefaultApiVersion, listAllServiceNamespaces } from "../../src/public-utils.js";
import { createSdkContextForTester, SimpleTester } from "../tester.js";

it("get single", async () => {
  const { program } = await SimpleTester.compile(`
    enum Versions {
      v2022_01_01: "2022-01-01",
    }

    @versioned(Versions)
    @service
    namespace MyService {};
  `);
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" });
  const serviceNamespace = listAllServiceNamespaces(context)[0];
  const defaultApiVersion = getDefaultApiVersion(context, serviceNamespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "2022-01-01");
});

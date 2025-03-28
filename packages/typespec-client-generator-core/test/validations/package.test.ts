import { expectDiagnostics } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { listClients } from "../../src/decorators.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("service-more-than-one", async () => {
  const diagnostics = await runner.diagnose(
    `
      @service
      namespace Test1Client {
        op x(): void;
      }
      @service
      namespace Test2Client {
        op y(): void;
      }
    `,
  );

  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/service-more-than-one",
    },
  ]);

  strictEqual(listClients(runner.context).length, 1);
  strictEqual(runner.context.sdkPackage.clients.length, 1);

  const client = runner.context.sdkPackage.clients[0];
  strictEqual(client.name, "Test1Client");
  strictEqual(client.methods.length, 1);
  strictEqual(client.methods[0].name, "x");
});

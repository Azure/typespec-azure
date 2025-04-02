import { expectDiagnostics } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { listClients } from "../../src/decorators.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("multiple-services", async () => {
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
      code: "@azure-tools/typespec-client-generator-core/multiple-services",
    },
  ]);

  strictEqual(listClients(runner.context).length, 1);
  strictEqual(runner.context.sdkPackage.clients.length, 1);

  const client = runner.context.sdkPackage.clients[0];
  strictEqual(client.name, "Test1Client");
  strictEqual(client.methods.length, 1);
  strictEqual(client.methods[0].name, "x");
});

it("require-versioned-service", async () => {
  const diagnostics = await runner.diagnose(
    `
    @service
    @clientApiVersions(ApiVersions)
    namespace My.Service {
      enum ApiVersions { v1, v2, v3 };
    }
      `,
  );
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/require-versioned-service",
      severity: "warning",
      message: `Service "My.Service" must be versioned if you want to apply the "@clientApiVersions" decorator`,
    },
  ]);
});

it("missing-service-versions", async () => {
  const diagnostics = (
    await runner.compileAndDiagnoseWithCustomization(
      `
    @service
    @versioned(Versions)
    namespace My.Service {
      enum Versions { v1, v2, v3 };
    }
    `,
      `
    enum ClientApiVersions { v4, v5, v6 };
    @@clientApiVersions(My.Service, ClientApiVersions);
    `,
    )
  )[1];
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/missing-service-versions",
      severity: "warning",
      message: `The @clientApiVersions decorator is missing one or more versions defined in My.Service. Client API must support all service versions to ensure compatibility. Missing versions: v1, v2, v3. Please update the client API to support all required service versions.`,
    },
  ]);
});

import { FinalStateValue } from "@azure-tools/typespec-azure-core";
import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: @nullFinalStateVia decorator", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      emitterName: "@azure-tools/typespec-csharp",
    });
  });

  it("should set finalStateVia to undefined when @nullFinalStateVia is applied", async () => {
    await runner.compile(`
      @service
      namespace TestService {
        model JobResult {
          id: string;
          status: "Running" | "Succeeded" | "Failed";
        }

        @Azure.ClientGenerator.Core.Legacy.nullFinalStateVia
        @Azure.ClientGenerator.Core.Legacy.markAsLro
        @route("/jobs/{jobId}")
        @post
        op startJob(@path jobId: string): JobResult;
      }
    `);

    const methods = runner.context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 1);

    const method = methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.name, "startJob");

    // Check LRO metadata exists and finalStateVia is undefined
    const metadata = method.lroMetadata;
    ok(metadata);
    strictEqual(metadata.finalStateVia, undefined);

    // Check that the response model is properly set
    const responseType = method.response.type;
    ok(responseType);
    strictEqual(responseType.kind, "model");
    strictEqual(responseType.name, "JobResult");
  });

  it("should apply @nullFinalStateVia with language scope", async () => {
    await runner.compile(`
      @service
      namespace TestService {
        model ProcessingResponse {
          jobId: string;
          status: string;
        }

        @Azure.ClientGenerator.Core.Legacy.nullFinalStateVia("csharp")
        @Azure.ClientGenerator.Core.Legacy.markAsLro
        @route("/process")
        @post
        op processData(): ProcessingResponse;
      }
    `);

    const methods = runner.context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 1);

    const method = methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.name, "processData");

    const metadata = method.lroMetadata;
    ok(metadata);
    strictEqual(metadata.finalStateVia, undefined);
  });

  it("should not apply when language scope doesn't match", async () => {
    const pythonRunner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      emitterName: "@azure-tools/typespec-python",
    });

    await pythonRunner.compile(`
      @service
      namespace TestService {
        model ProcessingResponse {
          jobId: string;
          status: string;
        }

        @Azure.ClientGenerator.Core.Legacy.nullFinalStateVia("csharp")
        @Azure.ClientGenerator.Core.Legacy.markAsLro
        @route("/process")
        @post
        op processData(): ProcessingResponse;
      }
    `);

    const methods = pythonRunner.context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 1);

    const method = methods[0];
    strictEqual(method.kind, "lro");

    const metadata = method.lroMetadata;
    ok(metadata);
    // Should have finalStateVia since decorator is scoped to csharp and we're using python
    strictEqual(metadata.finalStateVia, FinalStateValue.location);
  });

  it("should work with @markAsLro decorator", async () => {
    await runner.compile(`
      @service
      namespace TestService {
        model DeploymentResult {
          id: string;
          status: "InProgress" | "Succeeded" | "Failed";
        }

        @Azure.ClientGenerator.Core.Legacy.nullFinalStateVia
        @Azure.ClientGenerator.Core.Legacy.markAsLro
        @route("/deployments/{deploymentId}")
        @post
        op startDeployment(@path deploymentId: string): DeploymentResult;
      }
    `);

    const methods = runner.context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 1);

    const method = methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.name, "startDeployment");

    const metadata = method.lroMetadata;
    ok(metadata);
    // finalStateVia should be undefined even though @markAsLro would set it to location
    strictEqual(metadata.finalStateVia, undefined);
  });

  it("should work with finalStateVia parameter", async () => {
    await runner.compile(`
      @service
      namespace TestService {
        model JobResult {
          id: string;
          status: "Running" | "Succeeded" | "Failed";
          @header("Operation-Location") opLoc: string;
        }

        @Azure.ClientGenerator.Core.Legacy.nullFinalStateVia
        @Azure.Core.useFinalStateVia("operation-location")
        @Azure.ClientGenerator.Core.Legacy.markAsLro
        @route("/jobs/{jobId}")
        @post
        op startJob(@path jobId: string): JobResult;
      }
    `);

    const methods = runner.context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 1);

    const method = methods[0];
    strictEqual(method.kind, "lro");

    const metadata = method.lroMetadata;
    ok(metadata);
    // finalStateVia should be undefined even though @finalStateVia would set it
    strictEqual(metadata.finalStateVia, undefined);
  });

  it("should work with negation scope", async () => {
    const javaRunner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });

    await javaRunner.compile(`
      @service
      namespace TestService {
        model ProcessingResponse {
          jobId: string;
          status: string;
        }

        @Azure.ClientGenerator.Core.Legacy.nullFinalStateVia("!(java, python)")
        @Azure.ClientGenerator.Core.Legacy.markAsLro
        @route("/process")
        @post
        op processData(): ProcessingResponse;
      }
    `);

    const methods = javaRunner.context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 1);

    const method = methods[0];
    strictEqual(method.kind, "lro");

    const metadata = method.lroMetadata;
    ok(metadata);
    // Should have finalStateVia since Java is excluded
    strictEqual(metadata.finalStateVia, FinalStateValue.location);
  });
});

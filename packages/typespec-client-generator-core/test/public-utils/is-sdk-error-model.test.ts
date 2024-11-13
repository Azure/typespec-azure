import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { equal, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { isPagedResultModel, isSdkErrorModel } from "../../src/public-utils.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";
import { UsageFlags } from "../../src/interfaces.js";

describe("typespec-client-generator-core: public-utils isSdkErrorModel", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  it("normal error model", async () => {
    await runner.compileWithBuiltInService(`
      @error
      model ErrorResponse {
        code: string;
        detail: ErrorDetail;
      }

      model ErrorDetail {
        msg: string;
        action: string;
      }

      op test(): ErrorResponse;
    `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    strictEqual(models[0].kind, "model");
    ok(models[0].usage & UsageFlags.Exception);
    ok(isSdkErrorModel(runner.context, models[0]));
    strictEqual(models[1].kind, "model");
    ok(models[1].usage & UsageFlags.Exception);
    strictEqual(isSdkErrorModel(runner.context, models[1]), false);
  });
});

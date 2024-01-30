import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { byosRule } from "../../src/rules/byos.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: byos rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(runner, byosRule, "@azure-tools/typespec-azure-core");
  });

  it("emit warning if content type is application/octet-stream ", async () => {
    await tester
      .expect(`op uploadFile(data: bytes, @header contentType: "application/octet-stream"): void;`)
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/byos",
      });
  });

  it("emit warning if content type is multipart/form-data (explicit)", async () => {
    await tester
      .expect(`op uploadFile(data: bytes, @header contentType: "multipart/form-data"): void;`)
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/byos",
      });
  });

  it("is ok if requesting json data", async () => {
    await tester
      .expect(`op sendJsonBase64(data: bytes, @header contentType: "application/json"): void;`)
      .toBeValid();
  });

  it("is ok if returning binary data", async () => {
    await tester
      .expect(`op download(): {data: bytes, @header contentType: "application/octet-stream"};`)
      .toBeValid();
  });
});

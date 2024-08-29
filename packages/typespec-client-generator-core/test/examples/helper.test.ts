import { Operation } from "@typespec/compiler";
import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { getHttpOperationExamples, getHttpOperationWithCache } from "../../src/public-utils.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: helper", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-java",
      "examples-dir": `./examples`,
    });
  });

  it("getHttpOperationExamples", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getOne.json",
      `${__dirname}/helper/getOne.json`
    );
    await runner.host.addRealTypeSpecFile(
      "./examples/getTwo.json",
      `${__dirname}/helper/getTwo.json`
    );
    const { get } = await runner.compile(`
      @service({})
      namespace TestClient {
        @test
        op get(): string;
      }
    `);

    const examples = getHttpOperationExamples(
      runner.context,
      getHttpOperationWithCache(runner.context, get as Operation)
    );
    strictEqual(examples.length, 2);
  });
});

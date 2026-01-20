import { t } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { it } from "vitest";
import { getHttpOperationExamples, getHttpOperationWithCache } from "../../src/public-utils.js";
import { createSdkContextForTester, SimpleTester } from "../tester.js";

it("getHttpOperationExamples", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/getOne.json",
    `${__dirname}/helper/getOne.json`,
  );
  await instance.fs.addRealTypeSpecFile(
    "./examples/getTwo.json",
    `${__dirname}/helper/getTwo.json`,
  );
  const { program, get } = await instance.compile(t.code`
    @service
    namespace TestClient {
      op ${t.op("get")}(): string;
    }
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
    "examples-dir": "./examples",
  });

  const examples = getHttpOperationExamples(context, getHttpOperationWithCache(context, get));
  strictEqual(examples.length, 2);
});

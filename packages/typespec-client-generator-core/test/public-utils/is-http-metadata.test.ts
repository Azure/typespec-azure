import { ok } from "assert";
import { beforeEach, it } from "vitest";
import { isHttpMetadata } from "../../src/public-utils.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("is http query", async () => {
  await runner.compileWithBuiltInService(`
    model BodyModel {
      @query
      query: string;
      
      prop: string;
    }
    op func(@bodyRoot body: BodyModel): void;
  `);

  const queryProperty = runner.context.sdkPackage.models[0].properties[0];
  ok(queryProperty);
  ok(isHttpMetadata(runner.context, queryProperty));
});

it("is http header", async () => {
  await runner.compileWithBuiltInService(`
    model BodyModel {
      @header
      header: string;
      
      prop: string;
    }
    op func(@bodyRoot body: BodyModel): void;
  `);

  const queryProperty = runner.context.sdkPackage.models[0].properties[0];
  ok(queryProperty);
  ok(isHttpMetadata(runner.context, queryProperty));
});

it("is http cookie", async () => {
  await runner.compileWithBuiltInService(`
    model BodyModel {
      @cookie
      cookie: string;
      
      prop: string;
    }
    op func(@bodyRoot body: BodyModel): void;
  `);

  const queryProperty = runner.context.sdkPackage.models[0].properties[0];
  ok(queryProperty);
  ok(isHttpMetadata(runner.context, queryProperty));
});

it("is http path", async () => {
  await runner.compileWithBuiltInService(`
    model BodyModel {
      @path
      path: string;
      
      prop: string;
    }
    op func(@bodyRoot body: BodyModel): void;
  `);

  const queryProperty = runner.context.sdkPackage.models[0].properties[0];
  ok(queryProperty);
  ok(isHttpMetadata(runner.context, queryProperty));
});

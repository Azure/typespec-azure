import { ok } from "assert";
import { it } from "vitest";
import { isHttpMetadata } from "../../src/public-utils.js";
import { createSdkContextForTester, SimpleTesterWithService } from "../tester.js";

it("is http query", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    model BodyModel {
      @query
      query: string;
      
      prop: string;
    }
    op func(@bodyRoot body: BodyModel): void;
  `);
  const context = await createSdkContextForTester(program);

  const queryProperty = context.sdkPackage.models[0].properties[0];
  ok(queryProperty);
  ok(isHttpMetadata(context, queryProperty));
});

it("is http header", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    model BodyModel {
      @header
      header: string;
      
      prop: string;
    }
    op func(@bodyRoot body: BodyModel): void;
  `);
  const context = await createSdkContextForTester(program);

  const queryProperty = context.sdkPackage.models[0].properties[0];
  ok(queryProperty);
  ok(isHttpMetadata(context, queryProperty));
});

it("is http cookie", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    model BodyModel {
      @cookie
      cookie: string;
      
      prop: string;
    }
    op func(@bodyRoot body: BodyModel): void;
  `);
  const context = await createSdkContextForTester(program);

  const queryProperty = context.sdkPackage.models[0].properties[0];
  ok(queryProperty);
  ok(isHttpMetadata(context, queryProperty));
});

it("is http path", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    model BodyModel {
      @path
      path: string;
      
      prop: string;
    }
    op func(@bodyRoot body: BodyModel): void;
  `);
  const context = await createSdkContextForTester(program);

  const queryProperty = context.sdkPackage.models[0].properties[0];
  ok(queryProperty);
  ok(isHttpMetadata(context, queryProperty));
});

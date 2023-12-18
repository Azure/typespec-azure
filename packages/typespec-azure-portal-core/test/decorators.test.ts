import { ModelProperty, StringLiteral, Type } from "@typespec/compiler";
import { BasicTestRunner } from "@typespec/compiler/testing";
import { deepEqual, strictEqual } from "assert";
import {
  getAboutDisplayName,
  getAboutKeywords,
  getAboutLearnMoreDocs,
  getBrowseArgQuery,
  getDisplayName,
} from "../src/decorators.js";
import { createPortalCoreTestRunner } from "./test-host.js";

//const browse = `@test @browse({argQuery:${browseArg}})`;

describe("my library", () => {
  let runner: BasicTestRunner;

  const browseFile = createbrowseTestDecorator(`{filePath:"./testfiles/query.kql"}`);
  const browseString = createbrowseTestDecorator(`"helloThisISArgQuery"`);
  //const testSpecWithbrowseFile = createTestSpec(browseFile);
  //const testSpecWithBrowseString = createTestSpec(browseString);

  beforeEach(async () => {
    runner = await createPortalCoreTestRunner();
  });

  // Check everything works fine
  it("does this", async () => {
    const { Foo } = await runner.compile(`
        @test model Foo {}
      `);
    strictEqual(Foo.kind, "Model");
  });

  it("test @displayName", async () => {
    const { Foo, name } = await runner.compile(`
        model Foo {
            @test @displayName("nickName")
            name: string;
        }
      `);
    const actual = getDisplayName(runner.program, name as ModelProperty);
    strictEqual(name.kind, "ModelProperty");
    strictEqual(actual, "nickName");
  });

  // it("test @browse with file", async () => {
  //   const browseOpt = {argQuery: {filePath:"./testfiles/query.kql"}} as BrowseOptions;
  //   const { Foo } = await runner.compile(
  //   `
  //   @service({title: "Microsoft.Foo"})
  //   @versioned(Versions)
  //   @armProviderNamespace
  //   namespace Microsoft.Foo;

  //   @test @browse({argQuery:{filePath:"./testfiles/query.kql"}})
  //   model Foo is TrackedResource<{}> {
  //       @key("widgetName")
  //       @segment("widgets")
  //     @path
  //       name: string;
  //   }

  //   model EmployeeProperties {
  //     age?: int32 = 29;
  //   }
  //   `);
  //   const result = getBrowseArgQuery(runner.program, Foo);
  //   //const actual = getDisplayName(runner.program, name as ModelProperty);
  //   strictEqual(Foo.kind, "Model");
  // //strictEqual(actual, "nickName");
  // });

  it("test @browse with string", async () => {
    const { Foo } = await runner.compile(createTestSpec(browseString));
    const result = getBrowseArgQuery(runner.program, Foo);
    //const actual = getDisplayName(runner.program, name as ModelProperty);
    strictEqual(Foo.kind, "Model");
    strictEqual(result.kind, "ModelProperty");
    strictEqual(result.type.kind, "String");
    strictEqual(result.type.value, "helloThisISArgQuery");
  });

  it("test @about", async () => {
    const aboutTest = `
        @test @about({
        displayName: "hello",
        keywords: ["a", "c", "b"],
        learnMoreDocs: ["www.azure.com", "www.portal.azure.com"],
      })`;
    const { Foo } = await runner.compile(createTestSpec(undefined, aboutTest));
    const displayName = getAboutDisplayName(runner.program, Foo);
    const keywords = getAboutKeywords(runner.program, Foo);
    const learnMoreDocs = getAboutLearnMoreDocs(runner.program, Foo);
    //const actual = getDisplayName(runner.program, name as ModelProperty);
    strictEqual(Foo.kind, "Model");
    strictEqual(displayName.kind, "ModelProperty");
    strictEqual(displayName.type.kind, "String");
    strictEqual(displayName.type.value, "hello");

    strictEqual(keywords.kind, "ModelProperty");
    strictEqual(keywords.type.kind, "Tuple");
    const keywordValues = keywords.type.values
      .filter((value: Type) => value.kind === "String")
      .map((value: Type) => (<StringLiteral>value).value);
    deepEqual(keywordValues, ["a", "c", "b"]);

    strictEqual(learnMoreDocs.kind, "ModelProperty");
    strictEqual(learnMoreDocs.type.kind, "Tuple");
    const learnMoreDocsValues = learnMoreDocs.type.values
      .filter((value: Type) => value.kind === "String")
      .map((value: Type) => (<StringLiteral>value).value);
    deepEqual(learnMoreDocsValues, ["www.azure.com", "www.portal.azure.com"]);
  });

  // Check diagnostics are emitted
  it("errors", async () => {
    const diagnostics = await runner.diagnose(`
         model Bar {}
      `);
    //expectDiagnostics(diagnostics, { code: "...", message: "..." });
  });
});

export function createTestSpec(browseDec?: string, aboutDec?: string) {
  return `
    @service({title: "Microsoft.Foo"})
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    @armProviderNamespace
    namespace Microsoft.Foo;

    ${aboutDec ? aboutDec : ""}
    ${browseDec ? browseDec : ""}
    model Foo is TrackedResource<{}> {
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
    }

    model EmployeeProperties {
      age?: int32 = 29;
    }
    `;
}

export function createbrowseTestDecorator(browseArg: string) {
  return `@test @browse({argQuery:${browseArg}})`;
}

export function createAboutTestDecorator(
  displayName?: string,
  keywords?: string,
  learnMoreDocs?: string
) {
  const example = `    @test @about({
      displayName: "hello",
      keywords: ["a", "c", "b"],
      learnMoreDocs: ["www.azure.com", "www.portal.azure.com"],
    })`;
  return `@test @about({
      ${displayName ? displayName + "," : ""}
      ${keywords ? keywords + "," : ""}
      ${learnMoreDocs ? learnMoreDocs + "," : ""}
    })`;
}

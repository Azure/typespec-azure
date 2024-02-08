import { ModelProperty } from "@typespec/compiler";
import { BasicTestRunner, expectDiagnostics } from "@typespec/compiler/testing";
import { deepEqual, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  getAboutDisplayName,
  getAboutKeywords,
  getAboutLearnMoreDocs,
  getBrowseArgQuery,
  getDisplayName,
  getMarketplaceOfferId,
} from "../src/decorators.js";
import { createPortalCoreTestRunner } from "./test-host.js";

describe("TypeSpec-Azure-Portal-Core decorators test", () => {
  let runner: BasicTestRunner;

  beforeEach(async () => {
    runner = await createPortalCoreTestRunner();
  });

  it("@displayName", async () => {
    const { name } = await runner.compile(`
        model Foo {
            @test @displayName("nickName")
            name: string;
        }
      `);
    const actual = getDisplayName(runner.program, name as ModelProperty);
    strictEqual(name.kind, "ModelProperty");
    strictEqual(actual, "nickName");
  });

  it("@browse with string", async () => {
    const browseString = createbrowseTestDecorator(`"helloThisISArgQuery"`);
    const { Foo } = await runner.compile(createTestSpec(browseString));
    const result = getBrowseArgQuery(runner.program, Foo);
    strictEqual(result, "helloThisISArgQuery");
  });

  it("@browse on non-ARM resource", async () => {
    const browseString = createbrowseTestDecorator(`"helloThisISArgQuery"`);
    const diagnostics = await runner.diagnose(`
        ${browseString}
        model Bar {}
      `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/not-a-resource",
      message: "@browse can only be applied to TrackedResource and ProxyResource models",
    });
  });

  it("@about", async () => {
    const aboutTest = `
      @test @about({
      displayName: "hello",
      keywords: ["a", "c", "b"],
      learnMoreDocs: ["www.azure.com", "www.portal.azure.com"],
      })
      @doc("this is doc for about decorator")`;
    const { Foo } = await runner.compile(createTestSpec(undefined, aboutTest));
    const displayName = getAboutDisplayName(runner.program, Foo);
    const keywords = getAboutKeywords(runner.program, Foo);
    const learnMoreDocs = getAboutLearnMoreDocs(runner.program, Foo);
    strictEqual(Foo.kind, "Model");
    strictEqual(displayName, "hello");
    deepEqual(keywords, ["a", "c", "b"]);
    deepEqual(learnMoreDocs, ["www.azure.com", "www.portal.azure.com"]);
  });

  it("@about on non-ARM resource", async () => {
    const aboutTest = `
        @test @about({
        displayName: "hello",
        keywords: ["a", "c", "b"],
        learnMoreDocs: ["www.azure.com", "www.portal.azure.com"],
      })`;
    const diagnostics = await runner.diagnose(`
        ${aboutTest}
        model Bar {}
      `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/not-a-resource",
      message: "@about can only be applied to TrackedResource and ProxyResource models",
    });
  });

  it("@marketplaceOffer.id", async () => {
    const marketplaceOffer = `@test @marketplaceOffer({id: "id"})`;
    const { Foo } = await runner.compile(createTestSpec(undefined, marketplaceOffer));
    const marketplaceOfferId = getMarketplaceOfferId(runner.program, Foo);
    strictEqual(marketplaceOfferId, "id");
  });

  it("@marketplaceOffer.id with space", async () => {
    const marketplaceOffer = `@test @marketplaceOffer({id: "id space"})`;
    const diagnostics = await runner.diagnose(createTestSpec(undefined, marketplaceOffer));
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/invalid-offer-id",
      message: "@marketplaceOffer id cannot have a blank space.",
    });
  });
});

export function createTestSpec(browseDec?: string, aboutDec?: string, marketplaceOffer?: string) {
  return `
    @service({title: "Microsoft.Foo"})
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    @armProviderNamespace
    namespace Microsoft.Foo;

    ${marketplaceOffer ?? ""}
    ${aboutDec ?? ""}
    ${browseDec ?? ""}
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

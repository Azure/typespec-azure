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
  getPromotion,
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
      learnMoreDocs: ["https://www.azure.com", "https://www.portal.azure.com"],
      })
      @doc("this is doc for about decorator")`;
    const { Foo } = await runner.compile(createTestSpec(undefined, aboutTest));
    const displayName = getAboutDisplayName(runner.program, Foo);
    const keywords = getAboutKeywords(runner.program, Foo);
    const learnMoreDocs = getAboutLearnMoreDocs(runner.program, Foo);
    strictEqual(Foo.kind, "Model");
    strictEqual(displayName, "hello");
    deepEqual(keywords, ["a", "c", "b"]);
    deepEqual(learnMoreDocs, ["https://www.azure.com", "https://www.portal.azure.com"]);
  });

  it("@about on non-ARM resource", async () => {
    const aboutTest = `
        @test @about({
        displayName: "hello",
        keywords: ["a", "c", "b"],
        learnMoreDocs: ["https://www.azure.com", "https://www.portal.azure.com"],
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

  it("@about with learnMoreDocs not starting with https", async () => {
    const aboutTest = `
      @test @about({
      displayName: "hello",
      learnMoreDocs: ["www.azure.com", "www.portal.azure.com"],
      })`;
    const diagnostics = await runner.diagnose(createTestSpec(undefined, aboutTest));
    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-azure-portal-core/invalid-link",
        message: "@about learnMoreDocs www.azure.com does not start with https://",
      },
      {
        code: "@azure-tools/typespec-azure-portal-core/invalid-link",
        message: "@about learnMoreDocs www.portal.azure.com does not start with https://",
      },
    ]);
  });

  it("@marketplaceOffer.id", async () => {
    const marketplaceOffer = `@test @marketplaceOffer({id: "id"})`;
    const { Foo } = await runner.compile(createTestSpec(undefined, undefined, marketplaceOffer));
    const marketplaceOfferId = getMarketplaceOfferId(runner.program, Foo);
    strictEqual(marketplaceOfferId, "id");
  });

  it("@marketplaceOffer.id with space", async () => {
    const marketplaceOffer = `@test @marketplaceOffer({id: "id space"})`;
    const diagnostics = await runner.diagnose(
      createTestSpec(undefined, undefined, marketplaceOffer)
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/invalid-offer-id",
      message: "@marketplaceOffer id cannot have a blank space.",
    });
  });

  it("@promotion", async () => {
    const promotion = `@test @promotion({apiVersion: "2024-02-20-preview"})`;
    const { Foo } = await runner.compile(
      createTestSpec(undefined, undefined, undefined, promotion)
    );
    const promotionOptions = getPromotion(runner.program, Foo);
    strictEqual(promotionOptions.apiVersion, "2024-02-20-preview");
    strictEqual(promotionOptions.autoUpdate, false);
  });

  it("@promotion with wrong apiVersion", async () => {
    const promotion = `@test @promotion({apiVersion: "2024-02-20"})`;
    const diagnostics = await runner.diagnose(
      createTestSpec(undefined, undefined, undefined, promotion)
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/invalid-apiversion",
      message: "@promotion apiVersion 2024-02-20 is not listed on ARM service API Version lists",
    });
  });

  it("@promotion with incorrect apiVersion", async () => {
    const promotion = `@test @promotion({apiVersion: "2023-01"})`;
    const diagnostics = await runner.diagnose(
      createTestSpec(undefined, undefined, undefined, promotion)
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/invalid-apiversion",
      message:
        "@promotion apiVersion 2023-01 is invalid, should be yyyy-mm-dd or yyyy-mm-dd-preview format",
    });
  });

  it("@promotion with autoupdate true", async () => {
    const promotion = `@test @promotion({
      apiVersion: Versions.v2024_02_20_preview, 
      autoUpdate: true
    })`;
    const { Foo } = await runner.compile(
      createTestSpec(undefined, undefined, undefined, promotion)
    );
    const promotionOptions = getPromotion(runner.program, Foo);
    strictEqual(promotionOptions.apiVersion, "2024-02-20-preview");
    strictEqual(promotionOptions.autoUpdate, true);
  });
});

export function createTestSpec(
  browseDec?: string,
  aboutDec?: string,
  marketplaceOffer?: string,
  promotion?: string
) {
  return `
    @service({title: "Microsoft.Foo"})
    @armProviderNamespace
    @versioned(Versions)
    namespace Microsoft.Foo;

    enum Versions {
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      v2022_09_02_preview: "2022-09-02-preview",
    
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      v2024_02_20_preview: "2024-02-20-preview",
    }

    ${marketplaceOffer ?? ""}
    ${aboutDec ?? ""}
    ${browseDec ?? ""}
    ${promotion ?? ""}
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

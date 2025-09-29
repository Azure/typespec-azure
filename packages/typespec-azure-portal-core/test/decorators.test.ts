import { expectDiagnostics, t, type TesterInstance } from "@typespec/compiler/testing";
import { deepEqual, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  getAboutDisplayNames,
  getAboutKeywords,
  getAboutLearnMoreDocs,
  getBrowseArgQuery,
  getDisplayName,
  getMarketplaceOfferId,
  getPromotion,
} from "../src/decorators.js";
import { Tester } from "./tester.js";

let runner: TesterInstance;

beforeEach(async () => {
  runner = await Tester.createInstance();
});

it("@displayName", async () => {
  const { name } = await runner.compile(t.code`
    model Foo {
      @displayName("nickName")
      ${t.modelProperty("name")}: string;
    }
  `);
  const actual = getDisplayName(runner.program, name);
  strictEqual(name.kind, "ModelProperty");
  strictEqual(actual, "nickName");
});

describe("@browse", () => {
  it("@browse with string", async () => {
    const { Foo } = await runner.compile(
      createTestSpec(`@browse({argQuery: "helloThisISArgQuery"})`),
    );
    const result = getBrowseArgQuery(runner.program, Foo);
    strictEqual(result, "helloThisISArgQuery");
  });

  it("@browse with wrong argQuery file extension", async () => {
    const diagnostics = await runner.diagnose(
      createTestSpecForDiagnose(`@browse({argQuery:{filePath: "./query.txt"}})`),
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/invalid-type",
      message: /^@browse.argQuery.filePath only allows kql or kml file, current file:/,
    });
  });

  it("@browse with wrong argQuery file string ", async () => {
    const diagnostics = await runner.diagnose(
      createTestSpecForDiagnose(`@browse({argQuery:"./query.txt"})`),
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/invalid-type",
      message:
        "@browse.argQuery only allows literal string query value, current query: ./query.txt",
    });
  });

  it("@browse on non-ARM resource", async () => {
    const diagnostics = await runner.diagnose(`
      @browse({argQuery:"helloThisISArgQuery"})
      model Bar {}
    `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/not-a-resource",
      message: "@browse can only be applied to TrackedResource models",
    });
  });

  it("@browse on proxy ARM resource", async () => {
    const diagnostics = await runner.diagnose(`
        @armProviderNamespace
        namespace Microsoft.Foo;
        @browse({argQuery:"helloThisISArgQuery"})
        model Foo is ProxyResource<{}> { ...ResourceNameParameter<Foo> }
      `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/not-a-resource",
      message: "@browse can only be applied to TrackedResource models",
    });
  });
});
describe("@about", () => {
  it("@about", async () => {
    const aboutTest = `
      @about({
      displayNames: {
        singular: "microsoft portal typespec",
        plural: "microsoft portal typespecs",
      },
      keywords: ["a", "c", "b"],
      learnMoreDocs: [
        {
          "title": "learn Azure",
          "uri": "https://www.azure.com"
        },
        {
          "title": "learn Azure Portal",
          "uri": "https://www.portal.azure.com"
        }
      ],
      })
      @doc("this is doc for about decorator")`;
    const { Foo } = await runner.compile(createTestSpec(aboutTest));
    const displayNames = getAboutDisplayNames(runner.program, Foo);
    const keywords = getAboutKeywords(runner.program, Foo);
    const learnMoreDocs = getAboutLearnMoreDocs(runner.program, Foo);
    strictEqual(Foo.kind, "Model");
    strictEqual(displayNames.singular, "microsoft portal typespec");
    strictEqual(displayNames.plural, "microsoft portal typespecs");
    deepEqual(keywords, ["a", "c", "b"]);
    deepEqual(learnMoreDocs.length, 2);
    deepEqual(learnMoreDocs[0], {
      title: "learn Azure",
      uri: "https://www.azure.com",
    });
    deepEqual(learnMoreDocs[1], {
      title: "learn Azure Portal",
      uri: "https://www.portal.azure.com",
    });
  });

  it("@about on non-ARM resource", async () => {
    const aboutTest = `
        @about({
        displayNames: {
          singular: "microsoft portal typespec",
          plural: "microsoft portal typespecs",
        },
        keywords: ["a", "c", "b"],
        learnMoreDocs: [
          {
            "title": "learn Azure",
            "uri": "https://www.azure.com"
          },
          {
            "title": "learn Azure Portal",
            "uri": "https://www.portal.azure.com"
          }
        ],
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
      @about({
      displayNames: {
        singular: "microsoft portal typespec",
        plural: "microsoft portal typespecs",
      },
      learnMoreDocs: [
        {
          "title": "learn Azure",
          "uri": "www.azure.com"
        },
        {
          "title": "learn Azure Portal",
          "uri": "www.portal.azure.com"
        }
      ],
      })`;
    const diagnostics = await runner.diagnose(createTestSpecForDiagnose(aboutTest));
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

  it("@about with icon with wrong file extension", async () => {
    const aboutTest = `
      @about({
        icon: {
          filePath: "./icon.txt"
        }
      })`;
    const diagnostics = await runner.diagnose(createTestSpecForDiagnose(aboutTest));
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/invalid-type",
      message: /^@about.icon.filePath only allows svg file, current file:/,
    });
  });

  it("@about with icon with file does not exist", async () => {
    const aboutTest = `
      @about({
        icon: {
          filePath: "./fakeicon.svg"
        }
      })`;
    const diagnostics = await runner.diagnose(createTestSpecForDiagnose(aboutTest));
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/file-not-found",
      message: /^cannot find @about file icon from path/,
    });
  });
});

describe("@marketplaceOffer", () => {
  it("@marketplaceOffer.id", async () => {
    const marketplaceOffer = `@marketplaceOffer({id: "id"})`;
    const { Foo } = await runner.compile(createTestSpec(marketplaceOffer));
    const marketplaceOfferId = getMarketplaceOfferId(runner.program, Foo);
    strictEqual(marketplaceOfferId, "id");
  });

  it("@marketplaceOffer.id with space", async () => {
    const diagnostics = await runner.diagnose(
      createTestSpecForDiagnose(`@marketplaceOffer({id: "id space"})`),
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/invalid-offer-id",
      message: "@marketplaceOffer id cannot have a blank space.",
    });
  });
});

describe("@promotion", () => {
  it("@promotion", async () => {
    const { Foo } = await runner.compile(
      createTestSpec(`@promotion({apiVersion: "2024-02-20-preview"})`),
    );
    const promotionOptions = getPromotion(runner.program, Foo);
    strictEqual(promotionOptions.apiVersion, "2024-02-20-preview");
    strictEqual(promotionOptions.autoUpdate, false);
  });

  it("@promotion with wrong apiVersion", async () => {
    const diagnostics = await runner.diagnose(
      createTestSpecForDiagnose(`@promotion({apiVersion: "2024-02-20"})`),
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/invalid-apiversion",
      message: "@promotion apiVersion 2024-02-20 is not listed on ARM service API Version lists",
    });
  });

  it("@promotion with incorrect apiVersion", async () => {
    const diagnostics = await runner.diagnose(
      createTestSpecForDiagnose(`@promotion({apiVersion: "2023-01"})`),
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-portal-core/invalid-apiversion",
      message:
        "@promotion apiVersion 2023-01 is invalid, should be yyyy-mm-dd or yyyy-mm-dd-preview format",
    });
  });

  it("@promotion with autoupdate true", async () => {
    const promotion = `@promotion({
      apiVersion: Versions.v2024_02_20_preview, 
      autoUpdate: true
    })`;
    const { Foo } = await runner.compile(createTestSpec(promotion));
    const promotionOptions = getPromotion(runner.program, Foo);
    strictEqual(promotionOptions.apiVersion, "2024-02-20-preview");
    strictEqual(promotionOptions.autoUpdate, true);
  });
});

function createTestSpecForDiagnose(decorators?: string) {
  return createTestSpec(decorators).code;
}
function createTestSpec(decorators?: string) {
  return t.code`
    @armProviderNamespace
    @versioned(Versions)
    namespace Microsoft.Foo;

    enum Versions {
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
      v2022_09_02_preview: "2022-09-02-preview",
    
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      v2024_02_20_preview: "2024-02-20-preview",
    }

    ${decorators ?? ""}
    model ${t.model("Foo")} is TrackedResource<{}> { ...ResourceNameParameter<Foo> }
  `;
}

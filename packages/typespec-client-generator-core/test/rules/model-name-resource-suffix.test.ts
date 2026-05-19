import {
  createLinterRuleTester,
  LinterRuleTester,
  TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { modelNameResourceSuffixRule } from "../../src/rules/model-name-resource-suffix.rule.js";
import { SimpleTester } from "../tester.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(
    runner,
    modelNameResourceSuffixRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

it("emits warning when model name ends with Resource", async () => {
  await tester
    .expect(
      `model EvidenceResource {
        value: string;
      }`,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/model-name-resource-suffix",
      message: `Model name 'EvidenceResource' ends with 'Resource'. Consider dropping the suffix (e.g. 'Evidence') or use @clientName("Evidence", "csharp") to rename it for C#.`,
    });
});

it("is valid when model name does not end with Resource", async () => {
  await tester
    .expect(
      `model Evidence {
        value: string;
      }`,
    )
    .toBeValid();
});

it("is valid when model name ends with Resources (plural)", async () => {
  await tester
    .expect(
      `model BatchResources {
        items: string[];
      }`,
    )
    .toBeValid();
});

it("does not flag model named exactly Resource", async () => {
  await tester
    .expect(
      `model Resource {
        id: string;
      }`,
    )
    .toBeValid();
});

it("does not flag well-known base types", async () => {
  await tester
    .expect(
      `model TrackedResource {
        id: string;
      }
      model ProxyResource {
        id: string;
      }
      model ExtensionResource {
        id: string;
      }
      model GenericResource {
        id: string;
      }`,
    )
    .toBeValid();
});

it("is valid when @clientName removes Resource suffix", async () => {
  await tester
    .expect(
      `@clientName("Evidence", "csharp")
      model EvidenceResource {
        value: string;
      }`,
    )
    .toBeValid();
});

it("is valid when @clientName renames to Data suffix", async () => {
  await tester
    .expect(
      `@clientName("EvidenceData", "csharp")
      model EvidenceResource {
        value: string;
      }`,
    )
    .toBeValid();
});

it("emits warning when @clientName still ends with Resource", async () => {
  await tester
    .expect(
      `@clientName("MyEvidenceResource", "csharp")
      model SomeEvidence {
        value: string;
      }`,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/model-name-resource-suffix",
      message: `Model name 'MyEvidenceResource' ends with 'Resource'. Consider dropping the suffix (e.g. 'MyEvidence') or use @clientName("MyEvidence", "csharp") to rename it for C#.`,
    });
});

it("is case-sensitive - does not flag lowercase resource", async () => {
  await tester
    .expect(
      `model Myresource {
        value: string;
      }`,
    )
    .toBeValid();
});

it("does not flag non-model types", async () => {
  await tester.expect(`scalar ResourceId extends string;`).toBeValid();
});

describe("codefix", () => {
  it("offers drop Resource suffix codefix", async () => {
    await tester
      .expect(
        `
        model EvidenceResource {
          value: string;
        }`,
      )
      .applyCodeFix("drop-resource-suffix").toEqual(`
        @clientName("Evidence", "csharp")
        model EvidenceResource {
          value: string;
        }`);
  });

  it("offers rename to Data suffix codefix", async () => {
    await tester
      .expect(
        `
        model EvidenceResource {
          value: string;
        }`,
      )
      .applyCodeFix("rename-resource-to-data").toEqual(`
        @clientName("EvidenceData", "csharp")
        model EvidenceResource {
          value: string;
        }`);
  });
});

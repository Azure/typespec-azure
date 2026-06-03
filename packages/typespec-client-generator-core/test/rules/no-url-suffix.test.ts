import type { CompilerHost, Diagnostic } from "@typespec/compiler";
import { applyCodeFix, navigateProgram, resolveCodeFix } from "@typespec/compiler";
import {
  createLinterRuleTester,
  LinterRuleTester,
  TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { noUrlSuffixRule } from "../../src/rules/no-url-suffix.js";
import { SimpleTester } from "../tester.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noUrlSuffixRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

// --- Invalid cases ---

it("emits warning when property name ends with Url", async () => {
  await tester.expect(`model Foo { imageUrl: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/dotnet-no-url-suffix",
    message:
      "Property 'imageUrl' ends with 'Url'. Use 'Uri' suffix instead (e.g. 'imageUri'). Use @clientName(\"imageUri\", \"csharp\") to rename it for C#.",
  });
});

it("emits warning for callbackUrl", async () => {
  await tester.expect(`model Webhook { callbackUrl: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/dotnet-no-url-suffix",
  });
});

it("emits warning for property named exactly Url", async () => {
  await tester.expect(`model Link { Url: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/dotnet-no-url-suffix",
  });
});

it("emits warning when @clientName for another language does not resolve Url suffix", async () => {
  await tester
    .expect(`model Foo { @clientName("image_url", "python") imageUrl: string; }`)
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/dotnet-no-url-suffix",
    });
});

it("emits warning when @clientName introduces Url suffix", async () => {
  await tester
    .expect(`model Foo { @clientName("imageUrl", "csharp") image: string; }`)
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/dotnet-no-url-suffix",
    });
});

it("emits warning for spread property ending with Url", async () => {
  await tester
    .expect(
      `model Base { imageUrl: string; }
      model Foo { ...Base; }`,
    )
    .toEmitDiagnostics([
      { code: "@azure-tools/typespec-client-generator-core/dotnet-no-url-suffix" },
      { code: "@azure-tools/typespec-client-generator-core/dotnet-no-url-suffix" },
    ]);
});

it("emits warning for property introduced via is", async () => {
  await tester
    .expect(
      `model Base { imageUrl: string; }
      model Foo is Base {}`,
    )
    .toEmitDiagnostics([
      { code: "@azure-tools/typespec-client-generator-core/dotnet-no-url-suffix" },
      { code: "@azure-tools/typespec-client-generator-core/dotnet-no-url-suffix" },
    ]);
});

// --- Valid cases ---

it("is valid when property name ends with Uri", async () => {
  await tester.expect(`model Foo { imageUri: string; }`).toBeValid();
});

it("is valid when property does not end with Url", async () => {
  await tester.expect(`model Foo { name: string; }`).toBeValid();
});

it("is valid for Urls plural", async () => {
  await tester.expect(`model Foo { imageUrls: string[]; }`).toBeValid();
});

it("is case-sensitive — does not flag lowercase url", async () => {
  await tester.expect(`model Foo { imageurl: string; }`).toBeValid();
});

it("is valid when @clientName resolves Url to Uri for csharp", async () => {
  await tester
    .expect(`model Foo { @clientName("imageUri", "csharp") imageUrl: string; }`)
    .toBeValid();
});

it("is valid when augmented @clientName resolves Url to Uri", async () => {
  await tester
    .expect(
      `model Foo { imageUrl: string; }
      @@clientName(Foo.imageUrl, "imageUri", "csharp");`,
    )
    .toBeValid();
});

it("is valid when @clientName without language scope resolves Url to Uri", async () => {
  await tester.expect(`model Foo { @clientName("imageUri") imageUrl: string; }`).toBeValid();
});

it("does not flag inherited properties", async () => {
  await tester
    .expect(
      `model Base { imageUrl: string; }
      model Foo extends Base {}`,
    )
    .toEmitDiagnostics([
      { code: "@azure-tools/typespec-client-generator-core/dotnet-no-url-suffix" },
    ]);
});

it("does not flag non-model-property types", async () => {
  await tester.expect(`scalar ImageUrl extends string;`).toBeValid();
});

// --- Codefix ---

/**
 * Helper: compile code, run the rule manually (same as the rule tester does internally),
 * and return the diagnostics with codefixes.
 */
async function compileAndGetRuleDiagnostics(
  testRunner: TesterInstance,
  code: string,
): Promise<Diagnostic[]> {
  await testRunner.compileAndDiagnose(code);
  // Run the rule manually against the compiled program (matching rule-tester internals)
  const rule = {
    ...noUrlSuffixRule,
    id: `@azure-tools/typespec-client-generator-core/${noUrlSuffixRule.name}`,
  };
  const diagnostics: Diagnostic[] = [];
  const context = {
    program: testRunner.program,
    reportDiagnostic(diag: any) {
      diagnostics.push({ ...diag, code: rule.id, severity: "warning" as const, message: "" });
    },
  };
  const listener = noUrlSuffixRule.create(context as any);
  navigateProgram(testRunner.program, listener);
  return diagnostics;
}

describe("codefix", () => {
  it("generates @@clientName in client.tsp with correct path and content", async () => {
    const diagnostics = await compileAndGetRuleDiagnostics(
      runner,
      `model Foo { imageUrl: string; }`,
    );
    expect(diagnostics.length).toBeGreaterThanOrEqual(1);

    const diag = diagnostics[0];
    expect(diag.codefixes).toBeDefined();
    expect(diag.codefixes!.length).toBeGreaterThanOrEqual(1);

    const codefix = diag.codefixes![0];
    expect(codefix.id).toBe("dotnet-rename-url-to-uri");
    expect(codefix.label).toContain("imageUri");

    const edits = await resolveCodeFix(codefix);
    expect(edits.length).toBeGreaterThanOrEqual(1);

    // The last edit should be the @@clientName append
    const clientNameEdit = edits[edits.length - 1];
    expect(clientNameEdit.kind).toBe("insert-text");
    expect(clientNameEdit.file.path).toContain("client.tsp");
    expect(clientNameEdit.text).toContain("@@clientName(");
    expect(clientNameEdit.text).toContain("imageUrl");
    expect(clientNameEdit.text).toContain('"imageUri"');
    expect(clientNameEdit.text).toContain('"csharp"');

    // If there are header edits (imports/using), verify they target client.tsp too
    if (edits.length > 1) {
      const headerEdit = edits[0];
      expect(headerEdit.file.path).toContain("client.tsp");
      expect(headerEdit.text).toContain('import "@azure-tools/typespec-client-generator-core"');
      expect(headerEdit.text).toContain("using Azure.ClientGenerator.Core");
    }
  });

  it("generates correct client.tsp content via applyCodeFix", async () => {
    const diagnostics = await compileAndGetRuleDiagnostics(
      runner,
      `model Foo { imageUrl: string; }`,
    );
    const codefix = diagnostics[0].codefixes![0];

    // Capture all file writes
    const writtenFiles = new Map<string, string>();
    const host: CompilerHost = {
      ...runner.program.host,
      writeFile: (path, content) => {
        writtenFiles.set(path, content);
        return Promise.resolve();
      },
    };

    await applyCodeFix(host, codefix);

    // Find the client.tsp write
    const clientTspEntry = [...writtenFiles.entries()].find(([path]) =>
      path.endsWith("client.tsp"),
    );
    expect(clientTspEntry).toBeDefined();

    const [clientPath, clientContent] = clientTspEntry!;
    expect(clientPath).toMatch(/client\.tsp$/);
    expect(clientContent).toContain('import "@azure-tools/typespec-client-generator-core"');
    expect(clientContent).toContain("using Azure.ClientGenerator.Core");
    expect(clientContent).toContain("@@clientName(");
    expect(clientContent).toContain("imageUrl");
    expect(clientContent).toContain('"imageUri"');
    expect(clientContent).toContain('"csharp"');

    // Verify the augment target is a valid FQN (no leading dot)
    const clientNameLine = clientContent
      .split("\n")
      .find((l: string) => l.includes("@@clientName("));
    expect(clientNameLine).toBeDefined();
    expect(clientNameLine).toMatch(/@@clientName\(\w/); // must start with a word char, not a dot
    expect(clientNameLine).toContain("Foo.imageUrl");
  });
});

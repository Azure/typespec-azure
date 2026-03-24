import {
  createLinterRuleTester,
  LinterRuleTester,
  TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { createReservedWordRule } from "../../src/rules/reserved-words/create-reserved-word-rule.js";
import { csharpReservedWordsRule } from "../../src/rules/reserved-words/csharp.rule.js";
import { javaReservedWordsRule } from "../../src/rules/reserved-words/java.rule.js";
import { javascriptReservedWordsRule } from "../../src/rules/reserved-words/javascript.rule.js";
import { pythonReservedWordsRule } from "../../src/rules/reserved-words/python.rule.js";
import { LanguageReservedWords } from "../../src/rules/reserved-words/words.js";
import { SimpleTester } from "../tester.js";

function expectedMessage(name: string, context: string, language: string): string {
  return `'${name}' cannot be used as a ${context} name since it is a reserved word in ${language}. Consider using the @clientName decorator to rename it for ${language} code generation.`;
}

// A minimal reserved-word rule for testing the factory across all contexts.
const testWords: LanguageReservedWords = {
  model: new Set(["reserved"]),
  property: new Set(["reserved"]),
  parameter: new Set(["reserved"]),
  operation: new Set(["reserved"]),
  enumType: new Set(["reserved"]),
  enumMember: new Set(["reserved"]),
};
const testRule = createReservedWordRule("test", "Test", testWords);

// Each context has a unique reserved word to verify context isolation.
const contextIsolatedWords: LanguageReservedWords = {
  model: new Set(["modelonly"]),
  property: new Set(["proponly"]),
  parameter: new Set(["paramonly"]),
  operation: new Set(["oponly"]),
  enumType: new Set(["enumtypeonly"]),
  enumMember: new Set(["enummemberonly"]),
};
const contextIsolatedRule = createReservedWordRule("isolated", "Isolated", contextIsolatedWords);

describe("reserved word rule factory", () => {
  let runner: TesterInstance;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await SimpleTester.createInstance();
    tester = createLinterRuleTester(
      runner,
      testRule,
      "@azure-tools/typespec-client-generator-core",
    );
  });

  it("emits warning for reserved model name", async () => {
    await tester.expect(`model reserved { name: string; }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-test",
      message: expectedMessage("reserved", "model", "Test"),
    });
  });

  it("emits warning for reserved property name", async () => {
    await tester.expect(`model Foo { reserved: string; }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-test",
      message: expectedMessage("reserved", "property", "Test"),
    });
  });

  it("emits warning for reserved operation name", async () => {
    await tester.expect(`op reserved(): void;`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-test",
      message: expectedMessage("reserved", "operation", "Test"),
    });
  });

  it("emits warning for reserved parameter name", async () => {
    await tester.expect(`op foo(reserved: string): void;`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-test",
      message: expectedMessage("reserved", "parameter", "Test"),
    });
  });

  it("emits warning for reserved enum type name", async () => {
    await tester.expect(`enum reserved { a, b }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-test",
      message: expectedMessage("reserved", "enum", "Test"),
    });
  });

  it("emits warning for reserved enum member name", async () => {
    await tester.expect(`enum Foo { reserved }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-test",
      message: expectedMessage("reserved", "enum member", "Test"),
    });
  });

  it("emits warning for reserved union type name", async () => {
    await tester.expect(`union reserved { a: string, b: int32 }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-test",
      message: expectedMessage("reserved", "union", "Test"),
    });
  });

  it("emits warning for reserved union variant name", async () => {
    await tester.expect(`union Foo { reserved: string }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-test",
      message: expectedMessage("reserved", "union variant", "Test"),
    });
  });

  it("is valid for non-reserved names", async () => {
    await tester
      .expect(
        `
        model SafeName { safeProp: string; }
        op safeOp(): void;
        enum SafeEnum { safeValue }
        union SafeUnion { safeVariant: string }
        `,
      )
      .toBeValid();
  });

  it("is valid when @clientName renames away from reserved word", async () => {
    await tester
      .expect(`model Foo { @clientName("notReserved", "test") reserved: string; }`)
      .toBeValid();
  });

  it("still warns when @clientName for a different language does not fix it", async () => {
    await tester
      .expect(`model Foo { @clientName("notReserved", "otherlang") reserved: string; }`)
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-client-generator-core/reserved-words-test",
        message: expectedMessage("reserved", "property", "Test"),
      });
  });

  it("is valid when @clientName without scope renames away from reserved word", async () => {
    await tester.expect(`model Foo { @clientName("notReserved") reserved: string; }`).toBeValid();
  });
});

describe("context isolation", () => {
  let runner: TesterInstance;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await SimpleTester.createInstance();
    tester = createLinterRuleTester(
      runner,
      contextIsolatedRule,
      "@azure-tools/typespec-client-generator-core",
    );
  });

  // -- model-only word --

  it("warns when model-only reserved word is used as a model name", async () => {
    await tester.expect(`model modelonly { name: string; }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-isolated",
      message: expectedMessage("modelonly", "model", "Isolated"),
    });
  });

  it("does not warn when model-only reserved word is used as a property name", async () => {
    await tester.expect(`model Foo { modelonly: string; }`).toBeValid();
  });

  it("does not warn when model-only reserved word is used as an operation name", async () => {
    await tester.expect(`op modelonly(): void;`).toBeValid();
  });

  it("does not warn when model-only reserved word is used as an enum member name", async () => {
    await tester.expect(`enum Foo { modelonly }`).toBeValid();
  });

  // -- property-only word --

  it("warns when property-only reserved word is used as a property name", async () => {
    await tester.expect(`model Foo { proponly: string; }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-isolated",
      message: expectedMessage("proponly", "property", "Isolated"),
    });
  });

  it("does not warn when property-only reserved word is used as a model name", async () => {
    await tester.expect(`model proponly { name: string; }`).toBeValid();
  });

  it("does not warn when property-only reserved word is used as an operation name", async () => {
    await tester.expect(`op proponly(): void;`).toBeValid();
  });

  // -- operation-only word --

  it("warns when operation-only reserved word is used as an operation name", async () => {
    await tester.expect(`op oponly(): void;`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-isolated",
      message: expectedMessage("oponly", "operation", "Isolated"),
    });
  });

  it("does not warn when operation-only reserved word is used as a property name", async () => {
    await tester.expect(`model Foo { oponly: string; }`).toBeValid();
  });

  it("does not warn when operation-only reserved word is used as a model name", async () => {
    await tester.expect(`model oponly { name: string; }`).toBeValid();
  });

  // -- parameter-only word --

  it("warns when parameter-only reserved word is used as a parameter name", async () => {
    await tester.expect(`op foo(paramonly: string): void;`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-isolated",
      message: expectedMessage("paramonly", "parameter", "Isolated"),
    });
  });

  it("does not warn when parameter-only reserved word is used as a property name", async () => {
    await tester.expect(`model Foo { paramonly: string; }`).toBeValid();
  });

  it("does not warn when parameter-only reserved word is used as an operation name", async () => {
    await tester.expect(`op paramonly(): void;`).toBeValid();
  });

  it("does not warn when parameter-only reserved word is used as a model name", async () => {
    await tester.expect(`model paramonly { name: string; }`).toBeValid();
  });

  // -- enumType-only word --

  it("warns when enumType-only reserved word is used as an enum type name", async () => {
    await tester.expect(`enum enumtypeonly { a, b }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-isolated",
      message: expectedMessage("enumtypeonly", "enum", "Isolated"),
    });
  });

  it("warns when enumType-only reserved word is used as a union type name", async () => {
    await tester.expect(`union enumtypeonly { a: string, b: int32 }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-isolated",
      message: expectedMessage("enumtypeonly", "union", "Isolated"),
    });
  });

  it("does not warn when enumType-only reserved word is used as a property name", async () => {
    await tester.expect(`model Foo { enumtypeonly: string; }`).toBeValid();
  });

  it("does not warn when enumType-only reserved word is used as an enum member name", async () => {
    await tester.expect(`enum Foo { enumtypeonly }`).toBeValid();
  });

  // -- enumMember-only word --

  it("warns when enumMember-only reserved word is used as an enum member name", async () => {
    await tester.expect(`enum Foo { enummemberonly }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-isolated",
      message: expectedMessage("enummemberonly", "enum member", "Isolated"),
    });
  });

  it("warns when enumMember-only reserved word is used as a union variant name", async () => {
    await tester.expect(`union Foo { enummemberonly: string }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-isolated",
      message: expectedMessage("enummemberonly", "union variant", "Isolated"),
    });
  });

  it("does not warn when enumMember-only reserved word is used as a model name", async () => {
    await tester.expect(`model enummemberonly { name: string; }`).toBeValid();
  });

  it("does not warn when enumMember-only reserved word is used as an operation name", async () => {
    await tester.expect(`op enummemberonly(): void;`).toBeValid();
  });
});

describe("python reserved words", () => {
  let runner: TesterInstance;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await SimpleTester.createInstance();
    tester = createLinterRuleTester(
      runner,
      pythonReservedWordsRule,
      "@azure-tools/typespec-client-generator-core",
    );
  });

  it("emits warning for Python keyword used as property name", async () => {
    await tester.expect(`model Foo { \`yield\`: string; }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-python",
      message: expectedMessage("yield", "property", "Python"),
    });
  });

  it("emits warning for 'self' used as property name (Python-specific)", async () => {
    await tester.expect(`model Foo { self: string; }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-python",
      message: expectedMessage("self", "property", "Python"),
    });
  });

  it("emits warning for 'enum' used as model name (Python-specific)", async () => {
    await tester.expect(`model \`enum\` { name: string; }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-python",
      message: expectedMessage("enum", "model", "Python"),
    });
  });

  it("emits warning for 'keys' used as property name (Python dict method conflict)", async () => {
    await tester.expect(`model Foo { keys: string; }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-python",
      message: expectedMessage("keys", "property", "Python"),
    });
  });

  it("'keys' does not warn as an operation name (property-only reserved word)", async () => {
    await tester.expect(`op keys(): void;`).toBeValid();
  });

  it("emits warning for 'stream' used as parameter name (Python TSP-specific)", async () => {
    await tester.expect(`op foo(stream: string): void;`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-python",
      message: expectedMessage("stream", "parameter", "Python"),
    });
  });

  it("'stream' does not warn as a property name (parameter-only reserved word)", async () => {
    await tester.expect(`model Foo { stream: string; }`).toBeValid();
  });

  it("is valid when @clientName resolves conflict for python scope", async () => {
    await tester
      .expect(`model Foo { @clientName("yieldValue", "python") \`yield\`: string; }`)
      .toBeValid();
  });
});

describe("csharp reserved words", () => {
  let runner: TesterInstance;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await SimpleTester.createInstance();
    tester = createLinterRuleTester(
      runner,
      csharpReservedWordsRule,
      "@azure-tools/typespec-client-generator-core",
    );
  });

  it("emits warning for C# keyword used as property name", async () => {
    await tester.expect(`model Foo { \`namespace\`: string; }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-csharp",
      message: expectedMessage("namespace", "property", "C#"),
    });
  });

  it("emits warning for C# contextual keyword", async () => {
    await tester.expect(`model Foo { \`var\`: string; }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-csharp",
      message: expectedMessage("var", "property", "C#"),
    });
  });
});

describe("java reserved words", () => {
  let runner: TesterInstance;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await SimpleTester.createInstance();
    tester = createLinterRuleTester(
      runner,
      javaReservedWordsRule,
      "@azure-tools/typespec-client-generator-core",
    );
  });

  it("emits warning for Java keyword used as property name", async () => {
    await tester.expect(`model Foo { \`synchronized\`: string; }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-java",
      message: expectedMessage("synchronized", "property", "Java"),
    });
  });
});

describe("javascript reserved words", () => {
  let runner: TesterInstance;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await SimpleTester.createInstance();
    tester = createLinterRuleTester(
      runner,
      javascriptReservedWordsRule,
      "@azure-tools/typespec-client-generator-core",
    );
  });

  it("emits warning for JS keyword used as operation name", async () => {
    await tester.expect(`op \`function\`(): void;`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-javascript",
      message: expectedMessage("function", "operation", "JavaScript"),
    });
  });
});

describe("cross-language isolation", () => {
  it("JS-only keyword 'function' does not trigger Python rule", async () => {
    const runner = await SimpleTester.createInstance();
    const tester = createLinterRuleTester(
      runner,
      pythonReservedWordsRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await tester.expect(`op \`function\`(): void;`).toBeValid();
  });

  it("Python-only keyword 'lambda' does not trigger C# rule", async () => {
    const runner = await SimpleTester.createInstance();
    const tester = createLinterRuleTester(
      runner,
      csharpReservedWordsRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await tester.expect(`model Foo { \`lambda\`: string; }`).toBeValid();
  });

  it("Python-only keyword 'def' does not trigger Java rule", async () => {
    const runner = await SimpleTester.createInstance();
    const tester = createLinterRuleTester(
      runner,
      javaReservedWordsRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await tester.expect(`op def(): void;`).toBeValid();
  });

  it("C#-only keyword 'namespace' does not trigger JavaScript rule", async () => {
    const runner = await SimpleTester.createInstance();
    const tester = createLinterRuleTester(
      runner,
      javascriptReservedWordsRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await tester.expect(`model Foo { \`namespace\`: string; }`).toBeValid();
  });

  it("Java-only keyword 'synchronized' does not trigger Python rule", async () => {
    const runner = await SimpleTester.createInstance();
    const tester = createLinterRuleTester(
      runner,
      pythonReservedWordsRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await tester.expect(`model Foo { \`synchronized\`: string; }`).toBeValid();
  });
});

describe("diagnostic message format", () => {
  it("includes identifier name, context, and language in message", async () => {
    const runner = await SimpleTester.createInstance();
    const tester = createLinterRuleTester(
      runner,
      pythonReservedWordsRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await tester.expect(`model Foo { \`yield\`: string; }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/reserved-words-python",
      severity: "warning",
      message: expectedMessage("yield", "property", "Python"),
    });
  });
});

describe("multiple reserved words in same spec", () => {
  it("emits separate warnings for each reserved identifier", async () => {
    const runner = await SimpleTester.createInstance();
    const tester = createLinterRuleTester(
      runner,
      pythonReservedWordsRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await tester
      .expect(
        `model Foo {
          \`yield\`: string;
          \`async\`: string;
        }`,
      )
      .toEmitDiagnostics([
        { code: "@azure-tools/typespec-client-generator-core/reserved-words-python" },
        { code: "@azure-tools/typespec-client-generator-core/reserved-words-python" },
      ]);
  });
});

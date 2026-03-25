import {
  createLinterRuleTester,
  LinterRuleTester,
  TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noReservedWordsRule } from "../../src/rules/no-reserved-words.rule.js";
import { SimpleTester } from "../tester.js";

const CODE = "@azure-tools/typespec-client-generator-core/no-reserved-words";

function msg(name: string, context: string, language: string): string {
  return `'${name}' cannot be used as a ${context} name since it is a reserved word in ${language}. Consider using the @clientName decorator to rename it for ${language} code generation.`;
}

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noReservedWordsRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

// ---------------------------------------------------------------------------
// All contexts are checked (using language-unique words for single diagnostics)
// ---------------------------------------------------------------------------

describe("checks all identifier contexts", () => {
  // 'lambda' is only reserved in Python
  it("warns for reserved model name", async () => {
    await tester.expect(`model \`lambda\` { name: string; }`).toEmitDiagnostics({
      code: CODE,
      message: msg("lambda", "model", "Python"),
    });
  });

  it("warns for reserved property name", async () => {
    await tester.expect(`model Foo { \`lambda\`: string; }`).toEmitDiagnostics({
      code: CODE,
      message: msg("lambda", "property", "Python"),
    });
  });

  // 'function' is only reserved in JavaScript
  it("warns for reserved operation name", async () => {
    await tester.expect(`op \`function\`(): void;`).toEmitDiagnostics({
      code: CODE,
      message: msg("function", "operation", "JavaScript"),
    });
  });

  it("warns for reserved parameter name", async () => {
    await tester.expect(`op foo(\`lambda\`: string): void;`).toEmitDiagnostics({
      code: CODE,
      message: msg("lambda", "parameter", "Python"),
    });
  });

  it("warns for reserved enum type name", async () => {
    await tester.expect(`enum \`lambda\` { a, b }`).toEmitDiagnostics({
      code: CODE,
      message: msg("lambda", "enum", "Python"),
    });
  });

  it("warns for reserved enum member name", async () => {
    await tester.expect(`enum Foo { \`lambda\` }`).toEmitDiagnostics({
      code: CODE,
      message: msg("lambda", "enum member", "Python"),
    });
  });

  it("warns for reserved union type name", async () => {
    await tester.expect(`union \`lambda\` { a: string, b: int32 }`).toEmitDiagnostics({
      code: CODE,
      message: msg("lambda", "union", "Python"),
    });
  });

  it("warns for reserved union variant name", async () => {
    await tester.expect(`union Foo { \`lambda\`: string }`).toEmitDiagnostics({
      code: CODE,
      message: msg("lambda", "union variant", "Python"),
    });
  });
});

// ---------------------------------------------------------------------------
// Non-reserved names produce no warnings
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// @clientName suppression
// ---------------------------------------------------------------------------

describe("@clientName suppression", () => {
  it("is valid when @clientName without scope renames away from reserved word", async () => {
    await tester.expect(`model Foo { @clientName("notReserved") \`lambda\`: string; }`).toBeValid();
  });

  it("suppresses warning for one language but not others", async () => {
    // 'yield' is reserved in Python + C# + JS — rename only for Python
    await tester
      .expect(`model Foo { @clientName("yieldValue", "python") \`yield\`: string; }`)
      .toEmitDiagnostics([
        { code: CODE, message: msg("yield", "property", "C#") },
        { code: CODE, message: msg("yield", "property", "JavaScript") },
      ]);
  });

  it("is valid when @clientName covers all affected languages", async () => {
    // 'yield' is Python + C# + JS
    await tester
      .expect(
        `model Foo {
          @clientName("yieldValue", "python")
          @clientName("yieldValue", "csharp")
          @clientName("yieldValue", "javascript")
          \`yield\`: string;
        }`,
      )
      .toBeValid();
  });
});

// ---------------------------------------------------------------------------
// Context-specific reserved words (Python has different sets per context)
// ---------------------------------------------------------------------------

describe("context-specific reserved words", () => {
  // Python is the only language with different reserved words per context,
  // so these tests verify that context isolation works correctly.

  // -- property-only words (not reserved in other contexts) --

  it("'self' warns as property but not as model, operation, or enum member", async () => {
    await tester.expect(`model Foo { self: string; }`).toEmitDiagnostics({
      code: CODE,
      message: msg("self", "property", "Python"),
    });
    await tester.expect("op `self`(): void;").toBeValid();
    await tester.expect("model `self` { name: string; }").toBeValid();
    await tester.expect("enum Foo { `self` }").toBeValid();
  });

  it("'keys' warns as property but not as model or operation", async () => {
    await tester.expect(`model Foo { keys: string; }`).toEmitDiagnostics({
      code: CODE,
      message: msg("keys", "property", "Python"),
    });
    await tester.expect("op keys(): void;").toBeValid();
    await tester.expect("model keys { name: string; }").toBeValid();
  });

  it("'values' warns as property but not as operation", async () => {
    await tester.expect(`model Foo { values: string; }`).toEmitDiagnostics({
      code: CODE,
      message: msg("values", "property", "Python"),
    });
    await tester.expect("op values(): void;").toBeValid();
  });

  // -- parameter-only words (not reserved in property/model/operation contexts) --

  it("'stream' warns as parameter but not as property, model, or operation", async () => {
    await tester.expect(`op foo(stream: string): void;`).toEmitDiagnostics({
      code: CODE,
      message: msg("stream", "parameter", "Python"),
    });
    await tester.expect("model Foo { stream: string; }").toBeValid();
    await tester.expect("op stream(): void;").toBeValid();
    await tester.expect("model stream { name: string; }").toBeValid();
  });

  it("'continuation_token' warns as parameter but not as property", async () => {
    await tester.expect(`op foo(continuation_token: string): void;`).toEmitDiagnostics({
      code: CODE,
      message: msg("continuation_token", "parameter", "Python"),
    });
    await tester.expect("model Foo { continuation_token: string; }").toBeValid();
  });

  // -- model-only words (reserved in model context but not operation) --

  it("Python: 'enum' as model name warns but 'enum' as operation name warns for other reasons", async () => {
    // 'enum' is in Python model + enumType contexts, plus C#/Java/JS flat lists
    await tester.expect(`model \`enum\` { name: string; }`).toEmitDiagnostics([
      { code: CODE, message: msg("enum", "model", "Python") },
      { code: CODE, message: msg("enum", "model", "C#") },
      { code: CODE, message: msg("enum", "model", "Java") },
      { code: CODE, message: msg("enum", "model", "JavaScript") },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Language-unique keywords only warn for their language
// ---------------------------------------------------------------------------

describe("language-specific keywords", () => {
  // 'namespace' is C# only (not Python/Java/JS)
  it("C#: 'namespace' produces only a C# warning", async () => {
    await tester.expect(`model Foo { \`namespace\`: string; }`).toEmitDiagnostics({
      code: CODE,
      message: msg("namespace", "property", "C#"),
    });
  });

  // 'synchronized' is Java only
  it("Java: 'synchronized' produces only a Java warning", async () => {
    await tester.expect(`model Foo { \`synchronized\`: string; }`).toEmitDiagnostics({
      code: CODE,
      message: msg("synchronized", "property", "Java"),
    });
  });

  // 'function' is JS only
  it("JS: 'function' produces only a JS warning", async () => {
    await tester.expect(`op \`function\`(): void;`).toEmitDiagnostics({
      code: CODE,
      message: msg("function", "operation", "JavaScript"),
    });
  });

  // 'lambda' is Python only
  it("Python: 'lambda' produces only a Python warning", async () => {
    await tester.expect(`model Foo { \`lambda\`: string; }`).toEmitDiagnostics({
      code: CODE,
      message: msg("lambda", "property", "Python"),
    });
  });
});

// ---------------------------------------------------------------------------
// Multi-language warnings
// ---------------------------------------------------------------------------

describe("multi-language warnings", () => {
  it("'class' warns for all 4 languages", async () => {
    await tester.expect(`model Foo { \`class\`: string; }`).toEmitDiagnostics([
      { code: CODE, message: msg("class", "property", "Python") },
      { code: CODE, message: msg("class", "property", "C#") },
      { code: CODE, message: msg("class", "property", "Java") },
      { code: CODE, message: msg("class", "property", "JavaScript") },
    ]);
  });

  it("'yield' warns for Python, C#, and JavaScript", async () => {
    await tester.expect(`model Foo { \`yield\`: string; }`).toEmitDiagnostics([
      { code: CODE, message: msg("yield", "property", "Python") },
      { code: CODE, message: msg("yield", "property", "C#") },
      { code: CODE, message: msg("yield", "property", "JavaScript") },
    ]);
  });
});

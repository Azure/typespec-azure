/**
 * Context-specific reserved word sets for a language.
 *
 * Different languages may have different reserved words depending on where
 * an identifier is used (e.g., a word might be reserved as a model name but
 * not as a property name). This interface models that distinction.
 */
export interface LanguageReservedWords {
  /** Words reserved when used as model/class names */
  readonly model: ReadonlySet<string>;
  /** Words reserved when used as property names */
  readonly property: ReadonlySet<string>;
  /** Words reserved when used as operation/method names */
  readonly operation: ReadonlySet<string>;
  /** Words reserved when used as enum/union type names */
  readonly enumType: ReadonlySet<string>;
  /** Words reserved when used as enum/union member names */
  readonly enumMember: ReadonlySet<string>;
}

/**
 * Creates a {@link LanguageReservedWords} where every context shares the same
 * flat set of reserved words. Used for languages like C#, Java, and JS/TS
 * that don't distinguish reserved words by usage context.
 */
function createFlatReservedWords(words: readonly string[]): LanguageReservedWords {
  const set: ReadonlySet<string> = new Set(words);
  return { model: set, property: set, operation: set, enumType: set, enumMember: set };
}

// ---------------------------------------------------------------------------
// Python
// ---------------------------------------------------------------------------

// Source: packages/http-client-python/generator/pygen/preprocess/python_mappings.py
const pythonAlwaysReserved: readonly string[] = [
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "exec",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "int",
  "is",
  "lambda",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
];

export const pythonReservedWords: LanguageReservedWords = {
  model: new Set([...pythonAlwaysReserved, "enum"]),
  property: new Set([...pythonAlwaysReserved, "self"]),
  operation: new Set([...pythonAlwaysReserved]),
  enumType: new Set([...pythonAlwaysReserved, "enum"]),
  enumMember: new Set([...pythonAlwaysReserved]),
};

// ---------------------------------------------------------------------------
// C#
// ---------------------------------------------------------------------------

// Source: packages/http-client-csharp/generator/Microsoft.TypeSpec.Generator/
//         test/Utilities/StringExtensionsTests.cs  (IsCSharpKeyword via Roslyn SyntaxFacts)
export const csharpReservedWords: LanguageReservedWords = createFlatReservedWords([
  "abstract",
  "add",
  "alias",
  "as",
  "ascending",
  "async",
  "await",
  "base",
  "bool",
  "break",
  "by",
  "byte",
  "case",
  "catch",
  "char",
  "checked",
  "class",
  "const",
  "continue",
  "decimal",
  "default",
  "delegate",
  "descending",
  "do",
  "double",
  "else",
  "enum",
  "equals",
  "event",
  "explicit",
  "extern",
  "false",
  "finally",
  "fixed",
  "float",
  "for",
  "foreach",
  "from",
  "get",
  "global",
  "goto",
  "if",
  "implicit",
  "in",
  "int",
  "interface",
  "internal",
  "into",
  "is",
  "join",
  "let",
  "lock",
  "long",
  "nameof",
  "namespace",
  "new",
  "null",
  "object",
  "on",
  "operator",
  "out",
  "override",
  "params",
  "partial",
  "private",
  "protected",
  "public",
  "readonly",
  "ref",
  "remove",
  "return",
  "sbyte",
  "sealed",
  "set",
  "short",
  "sizeof",
  "stackalloc",
  "static",
  "string",
  "struct",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "uint",
  "ulong",
  "unchecked",
  "unmanaged",
  "unsafe",
  "ushort",
  "using",
  "var",
  "virtual",
  "void",
  "volatile",
  "when",
  "where",
  "while",
  "yield",
]);

// ---------------------------------------------------------------------------
// Java
// ---------------------------------------------------------------------------

// Source: packages/http-client-java/emitter/src/utils.ts (JAVA_KEYWORDS)
// Reference: https://docs.oracle.com/javase/tutorial/java/nutsandbolts/_keywords.html
export const javaReservedWords: LanguageReservedWords = createFlatReservedWords([
  "abstract",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extends",
  "final",
  "finally",
  "float",
  "for",
  "goto",
  "if",
  "implements",
  "import",
  "instanceof",
  "int",
  "interface",
  "long",
  "native",
  "new",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "strictfp",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "try",
  "void",
  "volatile",
  "while",
]);

// ---------------------------------------------------------------------------
// JavaScript / TypeScript
// ---------------------------------------------------------------------------

// Source: packages/emitter-framework/src/typescript/components/function-declaration.tsx
//         (reservedFunctionKeywords)
export const javascriptReservedWords: LanguageReservedWords = createFlatReservedWords([
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

const unsafeJavaScriptStringCharacters: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

/**
 * Returns a JavaScript/TypeScript string literal that preserves the input value while remaining
 * safe if generated source is later embedded in an HTML script element.
 */
export function toTypeScriptStringLiteral(value: string): string {
  return JSON.stringify(value).replace(
    /[<>\u2028\u2029]/g,
    (character) => unsafeJavaScriptStringCharacters[character]!,
  );
}

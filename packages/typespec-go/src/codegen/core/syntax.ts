/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CodegenError } from "./errors.js";

/**
 * Formats an arbitrary string as a valid Go interpreted string literal (`"..."`).
 *
 * All quotes, backslashes, ASCII/Unicode control characters, Unicode line/paragraph
 * separators, and unpaired UTF-16 surrogates are escaped so emitted Go source is
 * always lexically valid UTF-8 and passes `gofmt`.
 */
export function stringLiteral(value: string): string {
  let out = '"';
  for (let i = 0; i < value.length; ) {
    const code = value.charCodeAt(i);

    if (code >= 0xd800 && code <= 0xdbff) {
      const next = i + 1 < value.length ? value.charCodeAt(i + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += value.slice(i, i + 2);
        i += 2;
      } else {
        out += "\\ufffd";
        i += 1;
      }
      continue;
    }

    if (code >= 0xdc00 && code <= 0xdfff) {
      out += "\\ufffd";
      i += 1;
      continue;
    }

    i += 1;
    switch (code) {
      case 0x07:
        out += "\\a";
        break;
      case 0x08:
        out += "\\b";
        break;
      case 0x09:
        out += "\\t";
        break;
      case 0x0a:
        out += "\\n";
        break;
      case 0x0b:
        out += "\\v";
        break;
      case 0x0c:
        out += "\\f";
        break;
      case 0x0d:
        out += "\\r";
        break;
      case 0x22:
        out += '\\"';
        break;
      case 0x5c:
        out += "\\\\";
        break;
      default:
        if (code < 0x20 || code === 0x7f) {
          out += `\\x${code.toString(16).padStart(2, "0")}`;
        } else if ((code >= 0x80 && code <= 0x9f) || code === 0x2028 || code === 0x2029) {
          out += `\\u${code.toString(16).padStart(4, "0")}`;
        } else {
          out += String.fromCharCode(code);
        }
        break;
    }
  }
  out += '"';
  return out;
}

/**
 * Reports whether `value` can be emitted verbatim inside a Go raw string literal (`` `...` ``)
 * without altering its byte value (note Go raw string literals strip `\r` and cannot contain `` ` ``)
 * or embedding control characters / unpaired surrogates.
 */
export function canUseRawStringLiteral(value: string): boolean {
  for (let i = 0; i < value.length; ) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = i + 1 < value.length ? value.charCodeAt(i + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        i += 2;
        continue;
      }
      return false;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
    if (
      code === 0x60 ||
      code < 0x20 ||
      code === 0x7f ||
      (code >= 0x80 && code <= 0x9f) ||
      code === 0x2028 ||
      code === 0x2029
    ) {
      return false;
    }
    i += 1;
  }
  return true;
}

/**
 * Emits a Go raw string literal (`` `...` ``) when safe, falling back to an interpreted
 * Go string literal (`"..."`) when `value` contains backticks, control characters, `\r`,
 * newlines, or unpaired surrogates.
 */
export function rawOrStringLiteral(value: string): string {
  return canUseRawStringLiteral(value) ? `\`${value}\`` : stringLiteral(value);
}

function validateStructTagKey(key: string): void {
  if (key.length === 0) {
    throw new CodegenError("InternalError", "Go struct tag key cannot be empty");
  }
  for (let i = 0; i < key.length; i++) {
    const code = key.charCodeAt(i);
    if (
      code <= 0x20 ||
      code === 0x22 ||
      code === 0x3a ||
      code === 0x7f ||
      (code >= 0x80 && code <= 0x9f) ||
      code === 0x2028 ||
      code === 0x2029 ||
      (code >= 0xd800 && code <= 0xdfff)
    ) {
      throw new CodegenError(
        "InternalError",
        `invalid Go struct tag key ${JSON.stringify(key)}`,
      );
    }
  }
}

/**
 * Formats one or more `[key, value]` pairs as a valid Go struct field tag literal
 * compatible with `reflect.StructTag`. Uses raw backtick syntax unless a backtick is
 * present in the rendered tag, in which case it emits an interpreted Go string literal.
 */
export function structTagEntries(entries: ReadonlyArray<readonly [string, string]>): string {
  if (entries.length === 0) {
    throw new CodegenError("InternalError", "structTagEntries requires at least one entry");
  }
  const rendered = entries.map(([key, value]) => {
    validateStructTagKey(key);
    return `${key}:${stringLiteral(value)}`;
  });
  return rawOrStringLiteral(rendered.join(" "));
}

/**
 * Formats a single `key:"value"` Go struct field tag literal compatible with `reflect.StructTag`.
 */
export function structTag(key: string, value: string): string {
  return structTagEntries([[key, value]]);
}

/**
 * Replaces line terminators with single spaces so arbitrary text interpolated into a
 * single-line `// ...` Go comment cannot break onto a new source line.
 */
export function sanitizeSingleLineComment(text: string): string {
  return text.replace(/\r\n|[\r\n\u2028\u2029]/g, " ");
}

/**
 * Escapes all Go `regexp` (RE2 `regexp.QuoteMeta`) metacharacters in a literal text segment.
 */
export function escapeRegexpLiteral(text: string): string {
  return text.replace(/[\\.+*?()|[\]{}^$]/g, "\\$&");
}

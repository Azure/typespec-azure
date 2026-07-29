/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Primitives for recognizing lists in doc text. They live here so that both the
// TCGC adapter (which composes doc strings) and the code generator (which
// renders them as Go doc comments) agree on what a list item is.

// matches a bullet list item, capturing the item's text.
// Go doc comments recognize '-', '*' and '+' as bullet markers, each
// followed by at least one space or tab (see https://go.dev/doc/comment#lists).
export const bulletListItemRegex = /^\s*[-*+][ \t]+(.*)$/;

// matches a numbered list item, capturing the number and the item's text.
// Go doc comments recognize a decimal number followed by '.' or ')' and at
// least one space or tab as a numbered list item.
export const numberedListItemRegex = /^\s*(\d+)[.)][ \t]+(.*)$/;

export interface DocListItem {
  kind: "bullet" | "numbered";
  // the rendered marker without trailing space, e.g. "-" or "1.".
  marker: string;
  // the item's text (without the marker).
  text: string;
}

// classifies a single doc line as a bullet/numbered list item, or undefined
// when it isn't a list item. Leading whitespace is ignored on purpose: Go doc
// comments do not support nested lists, so source indentation carries no
// nesting meaning and every item is treated as a single-level list item.
export function matchDocListItem(line: string): DocListItem | undefined {
  const bullet = bulletListItemRegex.exec(line);
  if (bullet) {
    return { kind: "bullet", marker: "-", text: bullet[1]! };
  }
  const numbered = numberedListItemRegex.exec(line);
  if (numbered) {
    return { kind: "numbered", marker: `${numbered[1]}.`, text: numbered[2]! };
  }
  return undefined;
}

// reports whether the first non-blank line of text is a list item.
export function startsWithDocListItem(text: string): boolean {
  for (const line of text.split("\n")) {
    if (line.trim() === "") {
      continue;
    }
    return matchDocListItem(line) !== undefined;
  }
  return false;
}

// prefixes doc text with "<name> - ", the convention for generated Go doc
// comments. When the text opens with a list item the prefix is placed on its
// own line instead: merging it onto the item's line would demote that item to
// prose and orphan it from the rest of the list.
export function prefixDocWithName(name: string, text: string): string {
  return startsWithDocListItem(text) ? `${name} -\n${text}` : `${name} - ${text}`;
}

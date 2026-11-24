/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Shared list-recognition primitives, so the TCGC adapter (which composes doc
// strings) and the generator (which renders them) agree on what a list item is.

// Go doc comments accept '-', '*' and '+' bullets and 'N.'/'N)' numbering, each
// followed by a space or tab. See https://go.dev/doc/comment#lists.
const bulletListItemRegex = /^\s*[-*+][ \t]+(.*)$/;
const numberedListItemRegex = /^\s*(\d+)[.)][ \t]+(.*)$/;

export interface DocListItem {
  kind: "bullet" | "numbered";
  // the marker without its trailing space, e.g. "-" or "1.".
  marker: string;
  text: string;
}

// classifies a doc line as a list item, or undefined when it isn't one. Leading
// whitespace is ignored: Go has no nested lists, so indentation carries no
// nesting meaning and every item is rendered at a single level.
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

export function startsWithDocListItem(text: string): boolean {
  for (const line of text.split("\n")) {
    if (line.trim() === "") {
      continue;
    }
    return matchDocListItem(line) !== undefined;
  }
  return false;
}

// prefixes doc text with "<name> - ", the convention for generated doc comments.
// Text opening with a list item gets the prefix on its own line instead: merging
// would demote that item to prose and orphan it from the rest of the list.
export function prefixDocWithName(name: string, text: string): string {
  return startsWithDocListItem(text) ? `${name} -\n${text}` : `${name} - ${text}`;
}

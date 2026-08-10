// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * A tiny, dependency-free renderer for the small subset of Handlebars/Mustache
 * syntax used by the emitter's metadata templates. It intentionally supports only
 * what those templates need:
 *
 * - `{{ name }}` interpolation (always "unescaped", matching the previous
 *   `{ noEscape: true }` Handlebars option).
 * - `{{#if name}} ... {{else}} ... {{/if}}` conditional blocks (nesting allowed).
 *
 * It reproduces Handlebars' "standalone" whitespace handling so that a block tag
 * occupying its own line does not leave a blank line behind, keeping the rendered
 * output byte-for-byte identical to the previous Handlebars-based implementation.
 */

type TemplateData = Record<string, unknown>;

interface TextToken {
  kind: "text";
  value: string;
}

interface TagToken {
  kind: "open" | "else" | "close" | "var";
  /** Condition (for `open`) or variable name (for `var`). */
  name: string;
  /** Whether this block tag stands alone on its line (Handlebars semantics). */
  standalone: boolean;
}

type Token = TextToken | TagToken;

const MUSTACHE = /\{\{([^}]*)\}\}/g;

function tokenize(template: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  MUSTACHE.lastIndex = 0;
  while ((match = MUSTACHE.exec(template)) !== null) {
    tokens.push({ kind: "text", value: template.slice(lastIndex, match.index) });
    const inner = match[1]!.trim();
    if (inner.startsWith("#if ")) {
      tokens.push({ kind: "open", name: inner.slice(4).trim(), standalone: false });
    } else if (inner === "else") {
      tokens.push({ kind: "else", name: "", standalone: false });
    } else if (inner === "/if") {
      tokens.push({ kind: "close", name: "", standalone: false });
    } else {
      tokens.push({ kind: "var", name: inner, standalone: false });
    }
    lastIndex = match.index + match[0].length;
  }
  tokens.push({ kind: "text", value: template.slice(lastIndex) });
  return tokens;
}

/**
 * Applies Handlebars "standalone" whitespace stripping. A block tag (`#if`,
 * `else`, `/if`) that is the only non-whitespace content on its line has the
 * surrounding indentation and trailing newline removed.
 */
function stripStandaloneWhitespace(tokens: Token[]): void {
  const isBlock = (t: Token): t is TagToken =>
    t.kind === "open" || t.kind === "else" || t.kind === "close";

  // First pass: detect standalone tags from the original text tokens.
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (!isBlock(token)) {
      continue;
    }
    const prev = tokens[i - 1] as TextToken | undefined;
    const next = tokens[i + 1] as TextToken | undefined;
    const prevIsFirst = i - 1 === 0;
    const nextIsLast = i + 1 === tokens.length - 1;

    const prevValue = prev?.value ?? "";
    const nextValue = next?.value ?? "";

    const prevStandalone =
      /\n[ \t]*$/.test(prevValue) || (prevIsFirst && /^[ \t]*$/.test(prevValue));
    const nextStandalone =
      /^[ \t]*\n/.test(nextValue) || (nextIsLast && /^[ \t]*$/.test(nextValue));

    token.standalone = prevStandalone && nextStandalone;
  }

  // Second pass: strip whitespace around standalone tags.
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (!isBlock(token) || !token.standalone) {
      continue;
    }
    const prev = tokens[i - 1] as TextToken | undefined;
    const next = tokens[i + 1] as TextToken | undefined;
    if (prev) {
      // Drop the indentation preceding the tag, keeping the previous newline.
      prev.value = prev.value.replace(/[ \t]*$/, "");
    }
    if (next) {
      // Drop the rest of the tag's line, including its trailing newline.
      next.value = /^[ \t]*\n/.test(next.value)
        ? next.value.replace(/^[ \t]*\n/, "")
        : next.value.replace(/^[ \t]*$/, "");
    }
  }
}

type Node = TextNode | VarNode | IfNode;
interface TextNode {
  kind: "text";
  value: string;
}
interface VarNode {
  kind: "var";
  name: string;
}
interface IfNode {
  kind: "if";
  condition: string;
  whenTrue: Node[];
  whenFalse: Node[];
}

function parse(tokens: Token[], start: number, stopKinds: Token["kind"][]): [Node[], number] {
  const nodes: Node[] = [];
  let i = start;
  while (i < tokens.length) {
    const token = tokens[i]!;
    if (token.kind === "text") {
      if (token.value) {
        nodes.push({ kind: "text", value: token.value });
      }
      i++;
    } else if (token.kind === "var") {
      nodes.push({ kind: "var", name: token.name });
      i++;
    } else if (token.kind === "open") {
      const [whenTrue, afterTrue] = parse(tokens, i + 1, ["else", "close"]);
      let whenFalse: Node[] = [];
      let next = afterTrue;
      if (tokens[next]?.kind === "else") {
        const [elseNodes, afterElse] = parse(tokens, next + 1, ["close"]);
        whenFalse = elseNodes;
        next = afterElse;
      }
      // `next` now points at the matching `close` token.
      nodes.push({ kind: "if", condition: token.name, whenTrue, whenFalse });
      i = next + 1;
    } else if (stopKinds.includes(token.kind)) {
      return [nodes, i];
    } else {
      // Unmatched `else`/`close`; skip defensively.
      i++;
    }
  }
  return [nodes, i];
}

function isTruthy(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Boolean(value);
}

function renderNodes(nodes: Node[], data: TemplateData): string {
  let out = "";
  for (const node of nodes) {
    switch (node.kind) {
      case "text":
        out += node.value;
        break;
      case "var": {
        const value = data[node.name];
        out += value === undefined || value === null ? "" : String(value);
        break;
      }
      case "if":
        out += renderNodes(isTruthy(data[node.condition]) ? node.whenTrue : node.whenFalse, data);
        break;
    }
  }
  return out;
}

/**
 * Renders a metadata template against the provided data.
 *
 * @param template - Template using the supported `{{var}}` / `{{#if}}` subset.
 * @param data - Values referenced by the template.
 * @returns The rendered string.
 */
export function renderTemplate(template: string, data: TemplateData): string {
  const tokens = tokenize(template);
  stripStandaloneWhitespace(tokens);
  const [nodes] = parse(tokens, 0, []);
  return renderNodes(nodes, data);
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { describe, expect, it } from "vitest";

import { renderTemplate } from "../../../src/metadata/render-template.js";

describe("renderTemplate", () => {
  it("interpolates variables (trimmed names, unescaped)", () => {
    expect(renderTemplate("Hello {{ name }} & <{{tag}}>", { name: "World", tag: "b" })).toBe(
      "Hello World & <b>",
    );
  });

  it("renders undefined and null as empty strings", () => {
    expect(renderTemplate("[{{ a }}][{{ b }}]", { a: undefined, b: null })).toBe("[][]");
  });

  it("renders truthy/falsy conditionals with else", () => {
    const template = "{{#if on}}yes{{else}}no{{/if}}";
    expect(renderTemplate(template, { on: true })).toBe("yes");
    expect(renderTemplate(template, { on: false })).toBe("no");
    expect(renderTemplate(template, {})).toBe("no");
    expect(renderTemplate(template, { on: "" })).toBe("no");
    expect(renderTemplate(template, { on: 0 })).toBe("no");
    expect(renderTemplate(template, { on: [] })).toBe("no");
    expect(renderTemplate(template, { on: ["x"] })).toBe("yes");
  });

  it("supports nested conditionals", () => {
    const template = "{{#if a}}{{#if b}}AB{{else}}A{{/if}}{{else}}none{{/if}}";
    expect(renderTemplate(template, { a: true, b: true })).toBe("AB");
    expect(renderTemplate(template, { a: true, b: false })).toBe("A");
    expect(renderTemplate(template, { a: false })).toBe("none");
  });

  it("strips standalone block lines without leaving blank lines", () => {
    const template = ["A", "{{#if x}}", "B", "{{/if}}", "C"].join("\n");
    expect(renderTemplate(template, { x: true })).toBe("A\nB\nC");
    expect(renderTemplate(template, { x: false })).toBe("A\nC");
  });

  it("removes indentation of standalone block tags", () => {
    const template = ["A", "  {{#if x}}", "    B", "  {{/if}}", "C"].join("\n");
    expect(renderTemplate(template, { x: true })).toBe("A\n    B\nC");
  });

  it("keeps lines that contain multiple tags or inline content", () => {
    // Two close tags on one line are not standalone: the line's newline is kept.
    const template = "{{#if a}}{{#if b}}X\n{{/if}}{{/if}}\nDONE";
    expect(renderTemplate(template, { a: true, b: true })).toBe("X\n\nDONE");
  });

  it("does not strip whitespace around inline variable tags", () => {
    expect(renderTemplate("  {{ name }}  ", { name: "x" })).toBe("  x  ");
  });
});

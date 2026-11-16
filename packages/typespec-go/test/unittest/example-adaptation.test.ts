// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { describe, expect, it } from "vitest";
import { emitGoFor } from "./scenario-runner.js";

describe("Example adaptation", () => {
  it.each([false, true])(
    "preserves explicit null request fields without changing response or collection nulls (raw: %s)",
    async (raw) => {
      const value = {
        toolControls: null,
        label: null,
        items: null,
        byName: null,
        pet: null,
        timestamp: null,
        metadata: null,
        entries: [null],
        values: { cleared: null },
      };
      const input = raw ? { kind: "details", value } : { value };
      const files = await emitGoFor(
        `
          @service namespace Test;
          model ToolControls { enabled?: boolean; }
          @discriminator("kind") model Pet { kind: string; }
          model Cat extends Pet { kind: "cat"; }
          model Details {
            toolControls?: ToolControls | null;
            label?: string | null;
            items?: ToolControls[] | null;
            byName?: Record<ToolControls> | null;
            pet?: Pet | null;
            timestamp?: utcDateTime | null;
            metadata?: unknown;
            entries: (ToolControls | null)[];
            values: Record<ToolControls | null>;
            omitted?: string | null;
          }
          ${raw ? "@discriminated union Input { details: Details }" : "model Input { value: Details; }"}
          @route("/input") @patch
          op update(@body input: Input): Input;
        `,
        { "generate-samples": true },
        {
          "examples/update.json": JSON.stringify({
            operationId: "update",
            title: "update",
            parameters: { input },
            responses: { "200": { body: input } },
          }),
        },
      );
      const example = [...files].find(([name]) => name.endsWith("_example_test.go"))?.[1];
      expect(example).toBeDefined();
      expect(example).toContain('"github.com/Azure/azure-sdk-for-go/sdk/azcore"');
      expect(example).toContain('"time"');
      for (const [field, type] of [
        ["ToolControls", "*testmodule.ToolControls"],
        ["Label", "*string"],
        ["Items", "[]*testmodule.ToolControls"],
        ["ByName", "map[string]*testmodule.ToolControls"],
        ["Pet", "*testmodule.Pet"],
        ["Timestamp", "*time.Time"],
        ["Metadata", "*any"],
      ]) {
        expect(example).toContain(`${field}: azcore.NullValue[${type}]()`);
        expect(example).toContain(`// \t\t\t${field}: nil`);
      }
      expect(example).toContain("Entries: []*testmodule.ToolControls{\n\t\t\t\tnil,");
      expect(example).toContain('"cleared": nil');
      expect(example).not.toContain("Omitted:");
    },
  );

  it("keeps top-level null request parameters as nil", async () => {
    const files = await emitGoFor(
      `
        @service namespace Test;
        @route("/input") @put op put(@body input: string | null): void;
      `,
      { "generate-samples": true },
      {
        "examples/put.json": JSON.stringify({
          operationId: "put",
          title: "put",
          parameters: { input: null },
          responses: { "204": {} },
        }),
      },
    );
    const example = [...files].find(([name]) => name.endsWith("_example_test.go"))?.[1];
    expect(example).toContain("client.Put(ctx, nil, nil)");
    expect(example).not.toContain("azcore.NullValue");
    expect(example).not.toContain('"github.com/Azure/azure-sdk-for-go/sdk/azcore"');
  });

  it.each([false, true])(
    "passes synthesized discriminated arguments by reference (legacy: %s)",
    async (legacy) => {
      const files = await emitGoFor(
        `
          @service namespace Test;
          ${
            legacy
              ? '@discriminator("kind") model Pet { kind: string; } model Cat extends Pet { kind: "cat"; }'
              : "model Cat { name: string; } @discriminated union Pet { cat: Cat }"
          }
          @route("/pets") @put op put(@body input: Pet): void;
        `,
        { "generate-samples": true },
        {
          "examples/put.json": JSON.stringify({
            operationId: "put",
            title: "put",
            parameters: {},
            responses: { "204": {} },
          }),
        },
      );
      const example = [...files].find(([name]) => name.endsWith("_example_test.go"))?.[1];
      expect(example).toContain(`client.Put(ctx, &testmodule.${legacy ? "Pet" : "PetCat"}{`);
    },
  );

  it.each([false, true])("normalizes string-valued scalar examples (raw: %s)", async (raw) => {
    const value = { count: "42", enabled: " FALSE ", label: "42" };
    const input = raw ? { kind: "details", value } : { value };
    const files = await emitGoFor(
      `
        @armProviderNamespace namespace Microsoft.Test;
        model Details {
          @encode(string) count: int64;
          enabled: boolean;
          label: string;
        }
        ${raw ? "@discriminated union Input { details: Details }" : "model Input { value: Details; }"}
        @route("/input") @put op put(@body input: Input): Input;
      `,
      { "generate-samples": true },
      {
        "examples/put.json": JSON.stringify({
          operationId: "put",
          title: "put",
          parameters: { input },
          responses: { "200": { body: input } },
        }),
      },
    );
    const example = [...files].find(([name]) => name.endsWith("_example_test.go"))?.[1];
    expect(example).toContain("Count: to.Ptr[int64](42)");
    expect(example).toContain("Enabled: to.Ptr(false)");
    expect(example).toContain('Label: to.Ptr("42")');
  });

  it.each([
    { count: "", enabled: "true", type: "int64" },
    { count: "Infinity", enabled: "true", type: "int64" },
    { count: "42", enabled: "invalid", type: "bool" },
  ])("rejects invalid raw scalar examples: %j", async ({ count, enabled, type }) => {
    await expect(
      emitGoFor(
        `
          @service namespace Test;
          model Details { @encode(string) count: int64; enabled: boolean; }
          @discriminated union Input { details: Details }
          @route("/input") @put op put(@body input: Input): void;
        `,
        { "generate-samples": true },
        {
          "examples/put.json": JSON.stringify({
            operationId: "put",
            title: "put",
            parameters: { input: { kind: "details", value: { count, enabled } } },
            responses: { "204": {} },
          }),
        },
      ),
    ).rejects.toThrow(`cannot map example value '${type === "bool" ? enabled : count}' to ${type}`);
  });

  it.each([
    { raw: false, tag: "known" },
    { raw: true, tag: "known" },
    { raw: false, tag: "future" },
    { raw: true, tag: "future" },
  ])(
    "preserves nested values and discriminator selection (raw: $raw, tag: $tag)",
    async ({ raw, tag }) => {
      const value = {
        items: [{ wireName: "first", extra: "additional" }],
        byName: { second: { wireName: "second" } },
        count: 42,
        enabled: false,
        maybe: null,
        pet: tag === "known" ? { kind: tag, name: "Whiskers" } : { kind: tag },
      };
      const input = raw ? { kind: "details", value } : { value };
      const files = await emitGoFor(
        `
          @service namespace Test;

          model Item extends Record<string> {
            @encodedName("application/json", "wireName")
            name: string;
          }
          @discriminator("kind")
          model Pet { kind: string; }
          model Cat extends Pet { kind: "known"; name: string; }
          model Details {
            items: Item[];
            byName: Record<Item>;
            count: int32;
            enabled: boolean;
            maybe: string | null;
            pet: Pet;
          }
          ${raw ? "@discriminated union Input { details: Details }" : "model Input { value: Details; }"}

          @route("/input") @put op put(@body input: Input): Input;
        `,
        { "generate-samples": true },
        {
          "examples/put.json": JSON.stringify({
            operationId: "put",
            title: "put",
            parameters: { input },
            responses: { "200": { body: input } },
          }),
        },
      );
      const example = [...files].find(([name]) => name.endsWith("_example_test.go"))?.[1];
      expect(example).toBeDefined();
      expect(example).toContain("Items: []*testmodule.Item{");
      expect(example).toContain('Name: to.Ptr("first")');
      expect(example).toContain("AdditionalProperties: map[string]*string{");
      expect(example).toContain('"extra": to.Ptr("additional")');
      expect(example).toContain("ByName: map[string]*testmodule.Item{");
      expect(example).toContain('Name: to.Ptr("second")');
      expect(example).toContain("Count: to.Ptr[int32](42)");
      expect(example).toContain("Enabled: to.Ptr(false)");
      expect(example).toContain("Maybe: azcore.NullValue[*string]()");
      expect(example).toContain("// \t\t\tMaybe: nil");
      expect(example).toContain(`Pet: &testmodule.${tag === "known" ? "Cat" : "Pet"}{`);
      expect(example).toContain(`Kind: to.Ptr("${tag}")`);
    },
  );

  it.each([{}, { kind: "unknown" }])(
    "rejects a union example without a recognized discriminator: %j",
    async (input) => {
      await expect(
        emitGoFor(
          `
            @service namespace Test;
            model Cat { name: string; }
            @discriminated union Pet { cat: Cat }
            @route("/pets") @put op put(@body input: Pet): void;
          `,
          { "generate-samples": true },
          {
            "examples/put.json": JSON.stringify({
              operationId: "put",
              title: "put",
              parameters: { input },
              responses: { "204": {} },
            }),
          },
        ),
      ).rejects.toThrow(
        `unrecognized discriminator value ${"kind" in input ? input.kind : "undefined"} in example for PetClassification`,
      );
    },
  );
});

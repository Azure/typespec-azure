// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { describe, expect, it } from "vitest";
import { emitGoFor } from "./scenario-runner.js";

describe("Union usage in JSON additional properties", () => {
  it.each([false, true])(
    "preserves optional-field shape discrimination for JSON unions (also SSE: %s)",
    async (sse) => {
      const files = await emitGoFor(`
        @service namespace Test;
        model WidgetData1 { kind: "kind1"; start: utcDateTime; end?: utcDateTime; }
        model WidgetData2 { kind: "kind1"; start: string; }
        ${sse ? "@TypeSpec.Events.events" : ""}
        union Value { WidgetData2, WidgetData1 }
        model Container { name: string; ...Record<Value>; }
        @route("/properties") @post op roundTrip(@body body: Container): Container;
        ${sse ? '@route("/events") @get op receive(): TypeSpec.SSE.SSEStream<Value>;' : ""}
      `);
      const serde = files.get("zz_unions_serde.go")!;
      const jsonDecoder = serde.slice(serde.indexOf("func (v *Value) UnmarshalJSON("));
      expect(jsonDecoder).toContain('hasRequiredFields(rawMsg, "kind", "start", "end")');
      expect(jsonDecoder).toContain('hasRequiredFields(rawMsg, "kind", "start")');
      expect(jsonDecoder.indexOf("json.Unmarshal(data, &v.WidgetData1)")).toBeLessThan(
        jsonDecoder.indexOf("json.Unmarshal(data, &v.WidgetData2)"),
      );
      if (sse) {
        const eventDecoder = serde.slice(0, serde.indexOf("func (v Value) MarshalJSON("));
        expect(eventDecoder).toContain('hasRequiredFields(rawMsg, "kind", "start")');
        expect(eventDecoder).not.toContain('hasRequiredFields(rawMsg, "kind", "start", "end")');
      }
    },
  );

  it.each([
    {
      name: "multiple spread records",
      models: `
        model Container {
          flag: boolean;
          ...Record<string>;
          ...Record<float32>;
        }
      `,
    },
    {
      name: "spread union record",
      models: `
        union Value { string, float32 }
        model Container { flag: boolean; ...Record<Value>; }
      `,
    },
    {
      name: "inherited union record",
      models: `
        union Value { string, float32 }
        model Base extends Record<Value> { name: string; }
        model Container extends Base { count: float32; }
      `,
    },
    {
      name: "unions nested in additional-property containers",
      models: `
        union Value { string, float32 }
        model Container { flag: boolean; ...Record<Record<Value[]>>; }
      `,
    },
  ])("emits JSON union serialization for $name", async ({ models }) => {
    const files = await emitGoFor(`
      @service namespace Test;
      ${models}
      @route("/properties") @post op roundTrip(@body body: Container): Container;
    `);
    const unions = files.get("zz_unions.go");
    expect(unions).toBeDefined();
    const unionName = unions?.match(/type (\w+) struct/)?.[1];
    expect(unionName).toBeDefined();
    expect(unions).toContain("String *string");
    expect(unions).toContain("Float32 *float32");
    expect(files.get("zz_models.go")).toMatch(
      new RegExp(`AdditionalProperties map\\[string\\][^\\n]*\\*${unionName}`),
    );
    const serde = files.get("zz_unions_serde.go");
    expect(serde).toMatch(new RegExp(`func \\(\\w+ ${unionName}\\) MarshalJSON\\(\\)`));
    expect(serde).toMatch(
      new RegExp(`func \\(\\w+ \\*${unionName}\\) UnmarshalJSON\\(data \\[\\]byte\\)`),
    );
    expect(serde).not.toContain("streaming.SSEFrame");
    expect(files.get("zz_models_serde.go")).toContain("AdditionalProperties");
  });
});

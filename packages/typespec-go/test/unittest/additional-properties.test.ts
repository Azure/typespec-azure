// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { describe, expect, it } from "vitest";
import { emitGoFor } from "./scenario-runner.js";

describe("Union usage in JSON additional properties", () => {
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

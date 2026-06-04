import { Model } from "@typespec/compiler";
import { expectDiagnosticEmpty, t, TesterInstance } from "@typespec/compiler/testing";
import { $ } from "@typespec/compiler/typekit";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { Tester } from "./test-host.js";

let runner: TesterInstance;
beforeEach(async () => {
  runner = await Tester.createInstance();
});

describe("MergePatch", () => {
  describe("property optionality", () => {
    it("makes required properties optional", async () => {
      const { Result } = await runner.compile(t.code`
        model Input {
          required: string;
          alreadyOptional?: string;
        }
        model ${t.model("Result")} is MergePatch<Input, templateRenamer("{name}Patch")>;
      `);

      strictEqual(Result.properties.get("required")?.optional, true);
      strictEqual(Result.properties.get("alreadyOptional")?.optional, true);
    });

    it("keeps discriminator properties required", async () => {
      const { Result } = await runner.compile(t.code`
        @discriminator("kind")
        model Input {
          kind: "input";
          name: string;
        }
        model ${t.model("Result")} is MergePatch<Input, templateRenamer("{name}Patch")>;
      `);

      strictEqual(Result.properties.get("kind")?.optional, false);
      strictEqual(Result.properties.get("name")?.optional, true);
    });
  });

  describe("default removal", () => {
    it("removes default values from properties", async () => {
      const { Result } = await runner.compile(t.code`
        model Input {
          withDefault: string = "hello";
          withoutDefault: string;
        }
        model ${t.model("Result")} is MergePatch<Input, templateRenamer("{name}Patch")>;
      `);

      strictEqual(Result.properties.get("withDefault")?.defaultValue, undefined);
      strictEqual(Result.properties.get("withoutDefault")?.defaultValue, undefined);
    });
  });

  describe("visibility filtering", () => {
    it("includes properties with default lifecycle visibility", async () => {
      const { Result } = await runner.compile(t.code`
        model Input {
          noExplicitVisibility: string;
        }
        model ${t.model("Result")} is MergePatch<Input, templateRenamer("{name}Patch")>;
      `);

      ok(Result.properties.has("noExplicitVisibility"));
    });

    it("includes properties with Lifecycle.Update visibility", async () => {
      const { Result } = await runner.compile(t.code`
        model Input {
          @visibility(Lifecycle.Update)
          updateOnly: string;
        }
        model ${t.model("Result")} is MergePatch<Input, templateRenamer("{name}Patch")>;
      `);

      ok(Result.properties.has("updateOnly"));
    });

    it("excludes properties with only Lifecycle.Read visibility", async () => {
      const { Result } = await runner.compile(t.code`
        model Input {
          @visibility(Lifecycle.Read)
          readOnly: string;
        }
        model ${t.model("Result")} is MergePatch<Input, templateRenamer("{name}Patch")>;
      `);

      ok(!Result.properties.has("readOnly"));
    });

    it("excludes properties with only Lifecycle.Create visibility", async () => {
      const { Result } = await runner.compile(t.code`
        model Input {
          @visibility(Lifecycle.Create)
          createOnly: string;
        }
        model ${t.model("Result")} is MergePatch<Input, templateRenamer("{name}Patch")>;
      `);

      ok(!Result.properties.has("createOnly"));
    });

    it("includes properties with non-Lifecycle visibility", async () => {
      const { Result } = await runner.compile(t.code`
        enum Other { Flag }
        model Input {
          @visibility(Other.Flag)
          otherVis: string;
        }
        model ${t.model("Result")} is MergePatch<Input, templateRenamer("{name}Patch")>;
      `);

      ok(Result.properties.has("otherVis"));
    });
  });

  describe("recursive transformation", () => {
    it("transforms model-typed properties recursively", async () => {
      const { Result, program } = await runner.compile(t.code`
        model Child {
          value: string;
          @visibility(Lifecycle.Read)
          readOnly: string;
        }
        model Input {
          child: Child;
        }
        model ${t.model("Result")} is MergePatch<Input, templateRenamer("{name}Patch")>;
      `);

      const childProp = Result.properties.get("child")!;
      strictEqual(childProp.type.kind, "Model");
      const childPatch = childProp.type as Model;
      strictEqual(childPatch.name, "ChildPatch");
      strictEqual(childPatch.properties.get("value")?.optional, true);
      ok(!childPatch.properties.has("readOnly"));
    });

    it("does NOT transform array item types", async () => {
      const { Result, Child, program } = await runner.compile(t.code`
        model ${t.model("Child")} {
          value: string;
        }
        model Input {
          children: Child[];
        }
        model ${t.model("Result")} is MergePatch<Input, templateRenamer("{name}Patch")>;
      `);

      const childrenProp = Result.properties.get("children")!;
      strictEqual(childrenProp.type.kind, "Model");
      const arrayType = childrenProp.type as Model;
      ok($(program).array.is(arrayType));
      strictEqual(arrayType.indexer?.value, Child);
    });

    it("transforms Record value types recursively", async () => {
      const { Result, program } = await runner.compile(t.code`
        model Child {
          value: string;
          @visibility(Lifecycle.Read)
          readOnly: string;
        }
        model Input {
          metadata: Record<Child>;
        }
        model ${t.model("Result")} is MergePatch<Input, templateRenamer("{name}Patch")>;
      `);

      const metaProp = Result.properties.get("metadata")!;
      strictEqual(metaProp.type.kind, "Model");
      const recordType = metaProp.type as Model;
      ok($(program).record.is(recordType));
      const valueType = recordType.indexer?.value as Model;
      strictEqual(valueType.name, "ChildPatch");
      strictEqual(valueType.properties.get("value")?.optional, true);
      ok(!valueType.properties.has("readOnly"));
    });
  });

  describe("rename functions", () => {
    it("names transformed types using templateRenamer", async () => {
      const { Result } = await runner.compile(t.code`
        model Child { value: string; }
        model Input { child: Child; }
        model ${t.model("Result")} is MergePatch<Input, templateRenamer("{name}Update")>;
      `);

      const childType = Result.properties.get("child")!.type as Model;
      strictEqual(childType.name, "ChildUpdate");
    });

    it("names transformed types using mapRenamer", async () => {
      const { Result } = await runner.compile(t.code`
        model Child { value: string; }
        model Input { child: Child; }
        model ${t.model("Result")} is MergePatch<Input, mapRenamer(#{ Child: "ChildPatch" })>;
      `);

      const childType = Result.properties.get("child")!.type as Model;
      strictEqual(childType.name, "ChildPatch");
    });

    it("mapRenamer falls back to original name if not in mapping", async () => {
      const { Result } = await runner.compile(t.code`
        model Child { value: string; }
        model Input { child: Child; }
        model ${t.model("Result")} is MergePatch<Input, mapRenamer(#{ Other: "OtherPatch" })>;
      `);

      const childType = Result.properties.get("child")!.type as Model;
      strictEqual(childType.name, "Child");
    });

    it("supports renamer builders as standalone values", async () => {
      const [{ Observer }, diagnostics] = await runner.compileAndDiagnose(t.code`
        const mappedName = mapRenamer(#{ Foo: "Bar" });
        const templatedName = templateRenamer("{name}Patch");

        model ${t.model("Observer")} {
          mapped: string = mappedName("Foo");
          unchanged: string = mappedName("Baz");
          templated: string = templatedName("Foo");
        }
      `);

      expectDiagnosticEmpty(diagnostics);
      deepStrictEqual(
        [
          Observer.properties.get("mapped")?.defaultValue,
          Observer.properties.get("unchanged")?.defaultValue,
          Observer.properties.get("templated")?.defaultValue,
        ].map((x) =>
          x?.entityKind === "Value" && x.valueKind === "StringValue" ? x.value : undefined,
        ),
        ["Bar", "Baz", "FooPatch"],
      );
    });
  });

  describe("same renamer reused across multiple calls", () => {
    it("works correctly when same renamer is used for different models", async () => {
      const { ResultA, ResultB } = await runner.compile(t.code`
        model ChildA { value: string; }
        model ChildB { other: int32; }
        model InputA { child: ChildA; }
        model InputB { child: ChildB; }
        model ${t.model("ResultA")} is MergePatch<InputA, templateRenamer("{name}Patch")>;
        model ${t.model("ResultB")} is MergePatch<InputB, templateRenamer("{name}Patch")>;
      `);

      const childA = ResultA.properties.get("child")!.type as Model;
      const childB = ResultB.properties.get("child")!.type as Model;
      strictEqual(childA.name, "ChildAPatch");
      strictEqual(childB.name, "ChildBPatch");
    });
  });
});

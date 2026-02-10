import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { it } from "vitest";
import { getUsage } from "../../src/decorators.js";
import { UsageFlags } from "../../src/interfaces.js";
import { createSdkContextForTester, SimpleTester, SimpleTesterWithService } from "../tester.js";

it("defaults calculated usage", async () => {
  const { program, Model1, Model2, Model3, Model4 } = await SimpleTester.compile(t.code`
    @service
    @test namespace MyService {
      model ${t.model("Model1")}{ prop: string }

      model ${t.model("Model2")}{ prop: string }

      model ${t.model("Model3")}{ prop: string }

      model ${t.model("Model4")}{ prop: string }

      @route("/func1")
      op func1(@body body: Model1): void;

      @route("/func2")
      op func2(): Model2;

      @route("/func3")
      op func3(@body body: Model3): Model3;
    }
  `);

  const context = await createSdkContextForTester(program);
  strictEqual(getUsage(context, Model1), UsageFlags.Input | UsageFlags.Json);
  strictEqual(getUsage(context, Model2), UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, Model3), UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, Model4), UsageFlags.None);
});

it("usage override", async () => {
  const { program, Enum1, Enum2, Model1, Model2, Model3, Model4 } =
    await SimpleTester.compile(t.code`
    @service
    namespace MyService {
      @usage(Usage.input | Usage.output)
      enum ${t.enum("Enum1")}{
        one,
        two,
        three
      }

      enum ${t.enum("Enum2")}{
        one,
        two,
        three
      }

      @usage(Usage.input | Usage.output)
      model ${t.model("Model1")}{ prop: string }

      model ${t.model("Model4")}{ prop: string }

      @usage(Usage.input | Usage.output)
      model ${t.model("Model2")}{ prop: string }

      @usage(Usage.input | Usage.output)
      model ${t.model("Model3")}{ prop: string }

      @route("/func1")
      op func1(@body body: Model2): void;

      @route("/func2")
      op func2(): Model3;
    }
  `);

  const context = await createSdkContextForTester(program);
  strictEqual(getUsage(context, Model1), UsageFlags.Input | UsageFlags.Output);
  strictEqual(getUsage(context, Model2), UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, Model3), UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, Model4), UsageFlags.None);
  strictEqual(getUsage(context, Enum1), UsageFlags.Input | UsageFlags.Output);
  strictEqual(getUsage(context, Enum2), UsageFlags.None);
});

it("wrong usage value", async () => {
  const [, diagnostics] = await SimpleTester.compileAndDiagnose(t.code`
    @usage(1)
    model ${t.model("Model1")}{}
  `);

  expectDiagnostics(diagnostics, {
    code: "invalid-argument",
  });
});

it("usage propagation", async () => {
  const { program, Fish, Shark, Salmon, SawShark, Origin } = await SimpleTester.compile(t.code`
    @service
    namespace MyService {
      @discriminator("kind")
      model ${t.model("Fish")} {
        age: int32;
      }

      @discriminator("sharktype")
      @usage(Usage.input | Usage.output)
      model ${t.model("Shark")} extends Fish {
        kind: "shark";
        origin: Origin;
      }

      model ${t.model("Salmon")} extends Fish {
        kind: "salmon";
      }

      model ${t.model("SawShark")} extends Shark {
        sharktype: "saw";
      }

      model ${t.model("Origin")} {
        country: string;
        city: string;
        manufacture: string;
      }

      @get
      op getModel(): Fish;
    }
  `);

  const context = await createSdkContextForTester(program);
  strictEqual(getUsage(context, Fish), UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, Shark), UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, Salmon), UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, SawShark), UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, Origin), UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
});

it("usage and convenience", async () => {
  const { program, Fish } = await SimpleTester.compile(t.code`
    @service
    namespace MyService {
      model ${t.model("Fish")} {
        age: int32;
      }

      @put
      @convenientAPI(true)
      op putModel(@body body: Fish): void;

      @get
      @convenientAPI(false)
      op getModel(): Fish;
    }
  `);

  const context = await createSdkContextForTester(program);
  strictEqual(getUsage(context, Fish), UsageFlags.Input | UsageFlags.Json);

  const { program: anotherProgram, Dog } = await SimpleTester.compile(t.code`
    @service
    namespace MyService {
      model ${t.model("Dog")} {
        age: int32;
      }

      @put
      @convenientAPI(false)
      op putModel(@body body: Dog): void;

      @get
      @convenientAPI(true)
      op getModel(): Dog;
    }
  `);

  const anotherContext = await createSdkContextForTester(anotherProgram);
  strictEqual(getUsage(anotherContext, Dog), UsageFlags.Output | UsageFlags.Json);
});

it("patch usage", async () => {
  const { program, PatchModel, JsonMergePatchModel } = await SimpleTester.compile(t.code`
    @service
    namespace MyService {
      model ${t.model("PatchModel")} {
        age: int32;
      }

      model ${t.model("JsonMergePatchModel")} {
        prop: string
      }

      @patch(#{implicitOptionality: true})
      @route("/patch")
      op patchModel(@body body: PatchModel): void;

      @patch(#{implicitOptionality: true})
      @route("/jsonMergePatch")
      op jsonMergePatchModel(@body body: JsonMergePatchModel, @header contentType: "application/merge-patch+json"): void;
    }
  `);

  const context = await createSdkContextForTester(program);
  strictEqual(getUsage(context, PatchModel), UsageFlags.Input | UsageFlags.Json);
  strictEqual(
    getUsage(context, JsonMergePatchModel),
    UsageFlags.JsonMergePatch | UsageFlags.Input | UsageFlags.Json,
  );
});

it("@usage Input and Output on Namespace", async () => {
  const { program, OrphanModel, InputModel, OutputModel, RoundtripModel } =
    await SimpleTester.compile(t.code`
    @service
    @usage(Usage.input | Usage.output)
    namespace MyService {
      model ${t.model("OrphanModel")} {
        prop: string;
      }

      model ${t.model("InputModel")} {
        prop: string
      }

      model ${t.model("OutputModel")} {
        prop: string
      }

      model ${t.model("RoundtripModel")} {
        prop: string
      }

      @route("/one")
      op one(@body body: InputModel): OutputModel;

      @route("/two")
      op two(@body body: RoundtripModel): RoundtripModel;
    }
  `);

  const context = await createSdkContextForTester(program);
  strictEqual(getUsage(context, OrphanModel), UsageFlags.Input | UsageFlags.Output);
  // this is set to input and output because of the namespace override
  strictEqual(
    getUsage(context, InputModel),
    UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
  );
  strictEqual(
    getUsage(context, OutputModel),
    UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
  );
  strictEqual(
    getUsage(context, RoundtripModel),
    UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
  );
});

it("@usage namespace override", async () => {
  const { program, OrphanModel, OrphanModelWithOverride } = await SimpleTester.compile(t.code`
    @service
    @usage(Usage.input)
    namespace MyService {
      model ${t.model("OrphanModel")} {
        prop: string;
      }

      @usage(Usage.input | Usage.output)
      model ${t.model("OrphanModelWithOverride")} {
        prop: string;
      }
    }
  `);

  const context = await createSdkContextForTester(program);
  strictEqual(getUsage(context, OrphanModel), UsageFlags.Input);
  strictEqual(getUsage(context, OrphanModelWithOverride), UsageFlags.Input | UsageFlags.Output);
});

it("usage additive from operation", async () => {
  const { program } = await SimpleTesterWithService.compile(t.code`
    @usage(Usage.output)
    model A {}

    op test(@body body: A): void;
  `);
  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 1);
  // Should have Input + Json (from operation) + Output (from @usage)
  strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
});

it("usage additive from propagation", async () => {
  const { program } = await SimpleTesterWithService.compile(t.code`
    model A {
      prop: B;
    }

    @usage(Usage.output)
    model B {}

    op test(@body body: A): void;
  `);
  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  // A should have Input + Json from operation
  strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Json);
  // B should have Input + Json (from operation via propagation) + Output (from @usage)
  strictEqual(models[1].usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
});

it("usage additive from multiple sources", async () => {
  const { program } = await SimpleTesterWithService.compile(t.code`
    model A {
      prop: B;
    }

    model B {}

    @usage(Usage.output)
    model C {
      prop: B;
    }

    op test(@body body: A): void;
  `);
  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 3);
  // A should have Input + Json from operation
  strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Json);
  // B should have Input + Json (from A) + Output (from C)
  strictEqual(models[1].usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  // C should have Output from @usage
  strictEqual(models[2].usage, UsageFlags.Output);
});

it("usage additive from spread", async () => {
  const { program } = await SimpleTesterWithService.compile(t.code`
    model A {
      x: X;
    }

    model B {
      x: X;
    }

    @usage(Usage.input)
    model X {
    }

    op one(...B): B;

    op two(): B;
  `);
  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  strictEqual(
    models.find((m) => m.name === "B")?.usage,
    UsageFlags.Spread | UsageFlags.Output | UsageFlags.Json,
  );
  // X should have Input (from @usage) + Output + Json (from operations via propagation)
  strictEqual(
    models.find((m) => m.name === "X")?.usage,
    UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
  );
});

it("orphan model in group", async () => {
  const { program } = await SimpleTesterWithService.compile(t.code`
    @access(Access.public)
    @usage(Usage.output)
    namespace Models {
      model Model1 {
        ref: Model2;
      }

      model Model2 {
        name: string;
      }
    }
  `);
  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  strictEqual(models[0].usage, UsageFlags.Output);
  strictEqual(models[0].access, "public");
  strictEqual(models[1].usage, UsageFlags.Output);
  strictEqual(models[1].access, "public");
});

it("disableUsageAccessPropagationToBase true with override", async () => {
  const { program } = await SimpleTesterWithService.compile(t.code`
    model BaseClassThatsPruned {
      id: int32;
    }
    model DerivedOne extends BaseClassThatsPruned {
      name: string;
      prop: UsedByProperty;
    }
    model UsedByProperty {
      prop: string;
    }
    @@usage(DerivedOne, Usage.output);
  `);
  const context = await createSdkContextForTester(
    program,
    {},
    { disableUsageAccessPropagationToBase: true },
  );
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  strictEqual(models[0].usage, UsageFlags.Output);
  strictEqual(models[0].name, "DerivedOne");
  strictEqual(models[1].usage, UsageFlags.Output);
  strictEqual(models[1].name, "UsedByProperty");
});

it("disableUsageAccessPropagationToBase true", async () => {
  const { program } = await SimpleTesterWithService.compile(t.code`
    model BaseClassThatsPruned {
      id: int32;
    }
    model DerivedOne extends BaseClassThatsPruned {
      name: string;
      prop: UsedByProperty;
    }
    model UsedByProperty {
      prop: string;
    }

    op test(): DerivedOne;
  `);
  const context = await createSdkContextForTester(
    program,
    {},
    { disableUsageAccessPropagationToBase: true },
  );
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  strictEqual(models[0].usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(models[0].name, "DerivedOne");
  strictEqual(models[1].usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(models[1].name, "UsedByProperty");
});

it("disableUsageAccessPropagationToBase true property propagation", async () => {
  const { program } = await SimpleTesterWithService.compile(t.code`
    model BaseClassThatsPruned {
      id: int32;
      foo: UsedByBaseProperty;
    }
    model DerivedOne extends BaseClassThatsPruned {
      name: string;
      prop: UsedByProperty;
    }
    model UsedByProperty {
      prop: string;
    }
    model UsedByBaseProperty {
      prop: string;
    }

    op test(): DerivedOne;
  `);
  const context = await createSdkContextForTester(
    program,
    {},
    { disableUsageAccessPropagationToBase: true },
  );
  const models = context.sdkPackage.models;
  strictEqual(models.length, 3);
  strictEqual(models[0].usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(models[0].name, "DerivedOne");
  strictEqual(models[1].usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(models[1].name, "UsedByProperty");
  strictEqual(models[2].usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(models[2].name, "UsedByBaseProperty");
});

it("disableUsageAccessPropagationToBase true discriminator propagation", async () => {
  const { program } = await SimpleTesterWithService.compile(t.code`
    @discriminator("kind")
    model Fish {
      age: int32;
    }

    @discriminator("sharktype")
    model Shark extends Fish {
      kind: "shark";
      origin: Origin;
    }

    model Salmon extends Fish {
      kind: "salmon";
    }

    model SawShark extends Shark {
      sharktype: "saw";
    }

    model Origin {
      country: string;
      city: string;
      manufacture: string;
    }

    @get
    op getModel(): Fish;
  `);
  const context = await createSdkContextForTester(
    program,
    {},
    { disableUsageAccessPropagationToBase: true },
  );
  const models = context.sdkPackage.models;
  strictEqual(models.length, 5);
  strictEqual(models[0].usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(models[0].name, "Fish");
  strictEqual(models[1].usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(models[1].name, "Shark");
  strictEqual(models[2].usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(models[2].name, "Origin");
  strictEqual(models[3].usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(models[3].name, "SawShark");
  strictEqual(models[4].usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(models[4].name, "Salmon");
});

it("disableUsageAccessPropagationToBase true discriminator without ref propagation", async () => {
  const { program } = await SimpleTesterWithService.compile(t.code`
    @discriminator("kind")
    model Fish {
      age: int32;
    }

    model Shark extends Fish {
      kind: "shark";
    }

    model Salmon extends Fish {
      kind: "salmon";
    }


    @get
    @route("/getFish")
    op getShark(): Shark;

    @get
    @route("/getSalmon")
    op getSalmon(): Salmon;
  `);
  const context = await createSdkContextForTester(
    program,
    {},
    { disableUsageAccessPropagationToBase: true },
  );
  const models = context.sdkPackage.models;
  strictEqual(models.length, 3);
  strictEqual(models[0].usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(models[0].name, "Shark");
  strictEqual(models[1].usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(models[1].name, "Fish");
  strictEqual(models[2].usage, UsageFlags.Output | UsageFlags.Json);
  strictEqual(models[2].name, "Salmon");
});

it("discriminator removed when only subtype is used", async () => {
  const { program } = await SimpleTesterWithService.compile(`
      @discriminator("kind")
      model Pet {
        kind: string;
        name: string;
        weight?: float32;
      }
      model Cat extends Pet {
        kind: "cat";
        meow: int32;
      }
      model Dog extends Pet {
        kind: "dog";
        bark: string;
      }
      @route("/read")
      op read(): { @body body: Cat };
    `);

  const context = await createSdkContextForTester(program);
  const models = context.sdkPackage.models;

  // Only Cat and Pet should be in models (Dog should be filtered out by usage)
  strictEqual(models.length, 2);
  const petModel = models.find((m) => m.name === "Pet");
  const catModel = models.find((m) => m.name === "Cat");

  // Pet and Cat should exist
  strictEqual(petModel !== undefined, true);
  strictEqual(catModel !== undefined, true);

  // Dog should not be in models
  const dogModel = models.find((m) => m.name === "Dog");
  strictEqual(dogModel, undefined);

  // Since only Cat (a subtype) is used directly, Pet's discriminatedSubtypes should be cleared
  // This prevents language emitters from needing to handle Dog which has no usage
  strictEqual(petModel!.discriminatedSubtypes, undefined);
  strictEqual(petModel!.discriminatorProperty, undefined);
  strictEqual(catModel!.discriminatorValue, undefined);
});

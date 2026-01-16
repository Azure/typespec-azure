import { Enum, Model } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { it } from "vitest";
import { getUsage } from "../../src/decorators.js";
import { UsageFlags } from "../../src/interfaces.js";
import {
  createSdkContextForTester,
  SimpleTester,
  SimpleTesterWithBuiltInService,
} from "../tester.js";

it("defaults calculated usage", async () => {
  const result = await SimpleTester.compile(`
    @service
    @test namespace MyService {
      @test
      model Model1{ prop: string }

      @test
      model Model2{ prop: string }

      @test
      model Model3{ prop: string }

      @test
      model Model4 { prop: string }

      @test
      @route("/func1")
      op func1(@body body: Model1): void;

      @test
      @route("/func2")
      op func2(): Model2;

      @test
      @route("/func3")
      op func3(@body body: Model3): Model3;
    }
  `);
  const { Model1, Model2, Model3, Model4 } = result as unknown as {
    Model1: Model;
    Model2: Model;
    Model3: Model;
    Model4: Model;
  };

  const context = await createSdkContextForTester(result.program, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getUsage(context, Model1), UsageFlags.Input | UsageFlags.Json);
  strictEqual(getUsage(context, Model2), UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, Model3), UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, Model4), UsageFlags.None);
});

it("usage override", async () => {
  const result = await SimpleTester.compile(`
    @service
    @test namespace MyService {
      @test
      @usage(Usage.input | Usage.output)
      enum Enum1{
        one,
        two,
        three
      }

      @test
      enum Enum2{
        one,
        two,
        three
      }

      @test
      @usage(Usage.input | Usage.output)
      model Model1{ prop: string }

      @test
      model Model4{ prop: string }

      @test
      @usage(Usage.input | Usage.output)
      model Model2{ prop: string }

      @test
      @usage(Usage.input | Usage.output)
      model Model3{ prop: string }

      @test
      @route("/func1")
      op func1(@body body: Model2): void;

      @test
      @route("/func2")
      op func2(): Model3;
    }
  `);
  const { Model1, Model2, Model3, Model4, Enum1, Enum2 } = result as unknown as {
    Model1: Model;
    Model2: Model;
    Model3: Model;
    Model4: Model;
    Enum1: Enum;
    Enum2: Enum;
  };

  const context = await createSdkContextForTester(result.program, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getUsage(context, Model1), UsageFlags.Input | UsageFlags.Output);
  strictEqual(getUsage(context, Model2), UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, Model3), UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, Model4), UsageFlags.None);
  strictEqual(getUsage(context, Enum1), UsageFlags.Input | UsageFlags.Output);
  strictEqual(getUsage(context, Enum2), UsageFlags.None);
});

it("wrong usage value", async () => {
  const diagnostics = await SimpleTester.diagnose(`
    @test
    @usage(1)
    model Model1{}
  `);

  expectDiagnostics(diagnostics, {
    code: "invalid-argument",
  });
});

it("usage propagation", async () => {
  const result = await SimpleTester.compile(`
    @service
    @test namespace MyService {
      @discriminator("kind")
      @test
      model Fish {
        age: int32;
      }

      @discriminator("sharktype")
      @test
      @usage(Usage.input | Usage.output)
      model Shark extends Fish {
        kind: "shark";
        origin: Origin;
      }

      @test
      model Salmon extends Fish {
        kind: "salmon";
      }

      @test
      model SawShark extends Shark {
        sharktype: "saw";
      }

      @test
      model Origin {
        country: string;
        city: string;
        manufacture: string;
      }

      @get
      op getModel(): Fish;
    }
  `);
  const { Fish, Shark, Salmon, SawShark, Origin } = result as unknown as {
    Fish: Model;
    Shark: Model;
    Salmon: Model;
    SawShark: Model;
    Origin: Model;
  };

  const context = await createSdkContextForTester(result.program, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getUsage(context, Fish), UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, Shark), UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, Salmon), UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, SawShark), UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  strictEqual(getUsage(context, Origin), UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
});

it("usage and convenience", async () => {
  const result1 = await SimpleTester.compile(`
    @service
    @test namespace MyService {
      @test
      model Fish {
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
  const { Fish } = result1 as unknown as { Fish: Model };

  const context1 = await createSdkContextForTester(result1.program, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getUsage(context1, Fish), UsageFlags.Input | UsageFlags.Json);

  const result2 = await SimpleTester.compile(`
    @service
    @test namespace MyService {
      @test
      model Dog {
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
  const { Dog } = result2 as unknown as { Dog: Model };

  const context2 = await createSdkContextForTester(result2.program, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getUsage(context2, Dog), UsageFlags.Output | UsageFlags.Json);
});

it("patch usage", async () => {
  const result = await SimpleTester.compile(`
    @service
    @test namespace MyService {
      @test
      model PatchModel {
        age: int32;
      }

      @test
      model JsonMergePatchModel {
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
  const { PatchModel, JsonMergePatchModel } = result as unknown as {
    PatchModel: Model;
    JsonMergePatchModel: Model;
  };

  const context = await createSdkContextForTester(result.program, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getUsage(context, PatchModel), UsageFlags.Input | UsageFlags.Json);
  strictEqual(
    getUsage(context, JsonMergePatchModel),
    UsageFlags.JsonMergePatch | UsageFlags.Input | UsageFlags.Json,
  );
});

it("@usage Input and Output on Namespace", async () => {
  const result = await SimpleTester.compile(`
    @service
    @test
    @usage(Usage.input | Usage.output)
    namespace MyService {
      @test
      model OrphanModel {
        prop: string;
      }

      @test
      model InputModel {
        prop: string
      }

      @test
      model OutputModel {
        prop: string
      }

      @test
      model RoundtripModel {
        prop: string
      }

      @route("/one")
      op one(@body body: InputModel): OutputModel;

      @route("/two")
      op two(@body body: RoundtripModel): RoundtripModel;
    }
  `);
  const { OrphanModel, InputModel, OutputModel, RoundtripModel } = result as unknown as {
    OrphanModel: Model;
    InputModel: Model;
    OutputModel: Model;
    RoundtripModel: Model;
  };

  const context = await createSdkContextForTester(result.program, {
    emitterName: "@azure-tools/typespec-python",
  });
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
  const result = await SimpleTester.compile(`
    @service
    @test
    @usage(Usage.input)
    namespace MyService {
      @test
      model OrphanModel {
        prop: string;
      }

      @test
      @usage(Usage.input | Usage.output)
      model OrphanModelWithOverride {
        prop: string;
      }
    }
  `);
  const { OrphanModel, OrphanModelWithOverride } = result as unknown as {
    OrphanModel: Model;
    OrphanModelWithOverride: Model;
  };

  const context = await createSdkContextForTester(result.program, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getUsage(context, OrphanModel), UsageFlags.Input);
  strictEqual(getUsage(context, OrphanModelWithOverride), UsageFlags.Input | UsageFlags.Output);
});

it("usage additive from operation", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
      @usage(Usage.output)
      model A {}

      op test(@body body: A): void;
      `,
  );
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 1);
  // Should have Input + Json (from operation) + Output (from @usage)
  strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
});

it("usage additive from propagation", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
      model A {
        prop: B;
      }

      @usage(Usage.output)
      model B {}

      op test(@body body: A): void;
      `,
  );
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  // A should have Input + Json from operation
  strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Json);
  // B should have Input + Json (from operation via propagation) + Output (from @usage)
  strictEqual(models[1].usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
});

it("usage additive from multiple sources", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
      model A {
        prop: B;
      }

      model B {}

      @usage(Usage.output)
      model C {
        prop: B;
      }

      op test(@body body: A): void;
      `,
  );
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
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
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
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
      `,
  );
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
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
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
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
    `,
  );
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  strictEqual(models[0].usage, UsageFlags.Output);
  strictEqual(models[0].access, "public");
  strictEqual(models[1].usage, UsageFlags.Output);
  strictEqual(models[1].access, "public");
});

it("disableUsageAccessPropagationToBase true with override", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
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
    `,
  );
  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-python" },
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
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
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
    `,
  );
  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-python" },
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
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
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
    `,
  );
  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-python" },
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
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
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
    `,
  );
  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-python" },
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
  const { program } = await SimpleTesterWithBuiltInService.compile(
    `
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
    `,
  );
  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-python" },
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

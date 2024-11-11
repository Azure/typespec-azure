import { Enum, Model } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { getUsage } from "../../src/decorators.js";
import { UsageFlags } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: @usage", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  it("defaults calculated usage", async () => {
    const { Model1, Model2, Model3, Model4 } = (await runner.compile(`
        @service({})
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
      `)) as { Model1: Model; Model2: Model; Model3: Model; Model4: Model };

    strictEqual(getUsage(runner.context, Model1), UsageFlags.Input | UsageFlags.Json);
    strictEqual(getUsage(runner.context, Model2), UsageFlags.Output | UsageFlags.Json);
    strictEqual(
      getUsage(runner.context, Model3),
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
    );
    strictEqual(getUsage(runner.context, Model4), UsageFlags.None);
  });

  it("usage override", async () => {
    const { Model1, Model2, Model3, Model4, Enum1, Enum2 } = (await runner.compile(`
        @service({})
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
      `)) as {
      Model1: Model;
      Model2: Model;
      Model3: Model;
      Model4: Model;
      Enum1: Enum;
      Enum2: Enum;
    };

    strictEqual(getUsage(runner.context, Model1), UsageFlags.Input | UsageFlags.Output);
    strictEqual(
      getUsage(runner.context, Model2),
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
    );
    strictEqual(
      getUsage(runner.context, Model3),
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
    );
    strictEqual(getUsage(runner.context, Model4), UsageFlags.None);
    strictEqual(getUsage(runner.context, Enum1), UsageFlags.Input | UsageFlags.Output);
    strictEqual(getUsage(runner.context, Enum2), UsageFlags.None);
  });

  it("wrong usage value", async () => {
    const diagnostics = await runner.diagnose(`
        @test
        @usage(1)
        model Model1{}
      `);

    expectDiagnostics(diagnostics, {
      code: "invalid-argument",
    });
  });

  it("usage propagation", async () => {
    const { Fish, Shark, Salmon, SawShark, Origin } = (await runner.compile(`
        @service({})
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
      `)) as { Fish: Model; Shark: Model; Salmon: Model; SawShark: Model; Origin: Model };

    strictEqual(
      getUsage(runner.context, Fish),
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
    );
    strictEqual(
      getUsage(runner.context, Shark),
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
    );
    strictEqual(getUsage(runner.context, Salmon), UsageFlags.Output | UsageFlags.Json);
    strictEqual(
      getUsage(runner.context, SawShark),
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
    );
    strictEqual(
      getUsage(runner.context, Origin),
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
    );
  });

  it("usage and convenience", async () => {
    const { Fish } = (await runner.compile(`
        @service({})
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
      `)) as { Fish: Model };

    strictEqual(getUsage(runner.context, Fish), UsageFlags.Input | UsageFlags.Json);

    const { Dog } = (await runner.compile(`
        @service({})
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
      `)) as { Dog: Model };

    strictEqual(getUsage(runner.context, Dog), UsageFlags.Output | UsageFlags.Json);
  });

  it("patch usage", async () => {
    const { PatchModel, JsonMergePatchModel } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          model PatchModel {
            age: int32;
          }

          @test
          model JsonMergePatchModel {
            prop: string
          }

          @patch
          @route("/patch")
          op patchModel(@body body: PatchModel): void;

          @patch
          @route("/jsonMergePatch")
          op jsonMergePatchModel(@body body: JsonMergePatchModel, @header contentType: "application/merge-patch+json"): void;
        }
      `)) as { PatchModel: Model; JsonMergePatchModel: Model };

    strictEqual(getUsage(runner.context, PatchModel), UsageFlags.Input | UsageFlags.Json);
    strictEqual(
      getUsage(runner.context, JsonMergePatchModel),
      UsageFlags.JsonMergePatch | UsageFlags.Input | UsageFlags.Json,
    );
  });

  it("@usage Input and Output on Namespace", async () => {
    const { OrphanModel, InputModel, OutputModel, RoundtripModel } = (await runner.compile(`
        @service({})
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
      `)) as { OrphanModel: Model; InputModel: Model; OutputModel: Model; RoundtripModel: Model };
    strictEqual(getUsage(runner.context, OrphanModel), UsageFlags.Input | UsageFlags.Output);
    // this is set to input and output because of the namespace override
    strictEqual(
      getUsage(runner.context, InputModel),
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
    );
    strictEqual(
      getUsage(runner.context, OutputModel),
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
    );
    strictEqual(
      getUsage(runner.context, RoundtripModel),
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
    );
  });

  it("@usage namespace override", async () => {
    const { OrphanModel, OrphanModelWithOverride } = (await runner.compile(`
        @service({})
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
      `)) as { OrphanModel: Model; OrphanModelWithOverride: Model };
    strictEqual(getUsage(runner.context, OrphanModel), UsageFlags.Input);
    strictEqual(
      getUsage(runner.context, OrphanModelWithOverride),
      UsageFlags.Input | UsageFlags.Output,
    );
  });

  it("usage conflict from operation", async () => {
    await runner.compileWithBuiltInService(
      `
        @usage(Usage.output)
        model A {}

        op test(@body body: A): void;
        `,
    );
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Json);
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/conflict-usage-override",
    });
  });

  it("usage conflict from propagation", async () => {
    await runner.compileWithBuiltInService(
      `
        model A {
          prop: B;
        }

        @usage(Usage.output)
        model B {}

        op test(@body body: A): void;
        `,
    );
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Json);
    strictEqual(models[1].usage, UsageFlags.Input | UsageFlags.Json);
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/conflict-usage-override",
    });
  });

  it("usage conflict from other override", async () => {
    await runner.compileWithBuiltInService(
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
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 3);
    strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Json);
    strictEqual(models[1].usage, UsageFlags.Input | UsageFlags.Json);
    strictEqual(models[2].usage, UsageFlags.Output);
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/conflict-usage-override",
    });
  });

  it("usage conflict from spread", async () => {
    await runner.compileWithBuiltInService(
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
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    strictEqual(
      models.find((m) => m.name === "B")?.usage,
      UsageFlags.Spread | UsageFlags.Output | UsageFlags.Json,
    );
    strictEqual(
      models.find((m) => m.name === "X")?.usage,
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
    );
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/conflict-usage-override",
    });
  });

  it("orphan model in group", async () => {
    await runner.compileWithBuiltInService(
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
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    strictEqual(models[0].usage, UsageFlags.Output);
    strictEqual(models[0].access, "public");
    strictEqual(models[1].usage, UsageFlags.Output);
    strictEqual(models[1].access, "public");
  });

  it("disableUsageAccessPropagationToBase true with override", async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" }, { disableUsageAccessPropagationToBase: true });
    await runner.compileWithBuiltInService(
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
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    strictEqual(models[0].usage, UsageFlags.Output);
    strictEqual(models[0].name, "DerivedOne");
    strictEqual(models[1].usage, UsageFlags.Output);
    strictEqual(models[1].name, "UsedByProperty");
  });

  it("disableUsageAccessPropagationToBase true", async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" }, { disableUsageAccessPropagationToBase: true });
    await runner.compileWithBuiltInService(
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
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    strictEqual(models[0].usage, UsageFlags.Output | UsageFlags.Json);
    strictEqual(models[0].name, "DerivedOne");
    strictEqual(models[1].usage, UsageFlags.Output | UsageFlags.Json);
    strictEqual(models[1].name, "UsedByProperty");
  });
});

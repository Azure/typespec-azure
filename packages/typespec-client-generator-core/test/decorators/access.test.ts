import { Model, ModelProperty, Operation } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { getAccess } from "../../src/decorators.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: @access", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  describe("namespace access override", () => {
    it("should inherit access from parent namespace", async () => {
      const { Test } = (await runner.compile(`
          @access(Access.public)
          @service({title: "Test Service"}) namespace TestService;
          @test
          model Test {
            prop: string;
          }
        `)) as { Test: Operation };

      const actual = getAccess(runner.context, Test);
      strictEqual(actual, "public");
    });

    it("should tag anonymous models with default access", async () => {
      const { Test, prop } = (await runner.compile(`
          @access(Access.public)
          @service({title: "Test Service"}) namespace TestService;
          @test
          model Test {
            @test
            prop: {
               foo: string;
            }
          }
        `)) as { Test: Operation; prop: ModelProperty };

      const actual = getAccess(runner.context, Test);
      const actualAnonymous = getAccess(runner.context, prop.type as Model);
      strictEqual(actual, "public");
      strictEqual(actualAnonymous, "public");
    });

    it("should tag as internal anonymous models with default access", async () => {
      const { Test, prop } = (await runner.compile(`
          @access(Access.internal)
          @service({title: "Test Service"}) namespace TestService;
          @test
          model Test {
            @test
            prop: {
               foo: string;
            }
          }
        `)) as { Test: Operation; prop: ModelProperty };

      const actual = getAccess(runner.context, Test);
      const actualAnonymous = getAccess(runner.context, prop.type as Model);
      strictEqual(actual, "internal");
      strictEqual(actualAnonymous, "internal");
    });

    it("should honor the granular override over the namespace one", async () => {
      const { Test } = (await runner.compile(`
          @access(Access.public)
          @service({title: "Test Service"}) namespace TestService;
          @access(Access.internal)
          @test
          model Test {
            prop: string;
          }
        `)) as { Test: Operation };

      const actual = getAccess(runner.context, Test);
      strictEqual(actual, "internal");
    });

    it("locally mark an operation as internal", async () => {
      const { test } = (await runner.compile(`
          @access(Access.public)
          @service({title: "Test Service"}) namespace TestService;
          @test
          @access(Access.internal)
          op test(): void;
        `)) as { test: Operation };

      const actual = getAccess(runner.context, test);
      strictEqual(actual, "internal");
    });

    it("locally mark an operation as public", async () => {
      const { test } = (await runner.compile(`
          @access(Access.public)
          @service({title: "Test Service"}) namespace TestService;
          @test
          op test(): void;
        `)) as { test: Operation };

      const actual = getAccess(runner.context, test);
      strictEqual(actual, "public");
    });

    it("mark an operation as internal through the namespace", async () => {
      const { test } = (await runner.compile(`
          @access(Access.internal)
          @service({title: "Test Service"}) namespace TestService;
          @test
          op test(): void;
        `)) as { test: Operation };

      const actual = getAccess(runner.context, test);
      strictEqual(actual, "internal");
    });
  });

  it("default calculated value of operation is undefined, default value of calculated model is undefined", async () => {
    const { test, Test } = (await runner.compile(`
        @test
        model Test{}

        @test
        op test(): void;
      `)) as { test: Operation; Test: Model };

    strictEqual(getAccess(runner.context, test), "public");
    strictEqual(getAccess(runner.context, Test), "public");
  });

  it("model access calculated by operation", async () => {
    const { Test, func } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          model Test {
            prop: string;
          }
          @test
          @access(Access.internal)
          op func(
            @body body: Test
          ): void;
        }
      `)) as { Test: Model; func: Operation };

    let actual = getAccess(runner.context, Test);
    strictEqual(actual, "internal");
    actual = getAccess(runner.context, func);
    strictEqual(actual, "internal");
  });

  it("override calculated model with public access", async () => {
    const { Test, func } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          @access(Access.public)
          model Test {
            prop: string;
          }
          @test
          @access(Access.internal)
          op func(
            @body body: Test
          ): void;
        }
      `)) as { Test: Model; func: Operation };

    let actual = getAccess(runner.context, Test);
    strictEqual(actual, "public");
    actual = getAccess(runner.context, func);
    strictEqual(actual, "internal");
  });

  it("override calculated model with internal access", async () => {
    const { Test, func } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          @access(Access.internal) // This is an incorrect usage. We will have linter to ban.
          model Test {
            prop: string;
          }
          @test
          op func(
            @body body: Test
          ): void;
        }
        `)) as { Test: Model; func: Operation };

    strictEqual(getAccess(runner.context, Test), "internal");
    strictEqual(getAccess(runner.context, func), "public");
  });

  it("access propagation", async () => {
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
          @access(Access.internal)
          op getModel(): Fish;
        }
      `)) as { Fish: Model; Shark: Model; Salmon: Model; SawShark: Model; Origin: Model };

    let actual = getAccess(runner.context, Fish);
    strictEqual(actual, "internal");
    actual = getAccess(runner.context, Shark);
    strictEqual(actual, "internal");
    actual = getAccess(runner.context, Salmon);
    strictEqual(actual, "internal");
    actual = getAccess(runner.context, SawShark);
    strictEqual(actual, "internal");
    actual = getAccess(runner.context, Origin);
    strictEqual(actual, "internal");
  });

  it("complicated access propagation", async () => {
    const { Test1, Test2, Test3, Test4, Test5, Test6, func1, func2, func3, func4, func5 } =
      (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          model Test1 {
            prop: Test2;
          }
          @test
          model Test2 {
            prop: string;
          }
          @test
          @access(Access.internal)
          @route("/func1")
          op func1(
            @body body: Test1
          ): void;

          @test
          model Test3 {
            prop: string;
          }
          @test
          @access(Access.internal)
          @route("/func2")
          op func2(
            @body body: Test3
          ): void;
          @test
          @route("/func3")
          op func3(
            @body body: Test3
          ): void;

          @test
          model Test4 {
            prop: Test5;
          }
          @test
          model Test5 {
            prop: Test6;
          }
          @test
          model Test6 {
            prop: string;
          }
          @test
          @access(Access.internal)
          @route("/func4")
          op func4(
            @body body: Test4
          ): void;
          @test
          @route("/func5")
          op func5(
            @body body: Test6
          ): void;
        }
      `)) as {
        Test1: Model;
        Test2: Model;
        Test3: Model;
        Test4: Model;
        Test5: Model;
        Test6: Model;
        func1: Operation;
        func2: Operation;
        func3: Operation;
        func4: Operation;
        func5: Operation;
      };

    strictEqual(getAccess(runner.context, func1), "internal");
    strictEqual(getAccess(runner.context, func2), "internal");
    strictEqual(getAccess(runner.context, func3), "public");
    strictEqual(getAccess(runner.context, func4), "internal");
    strictEqual(getAccess(runner.context, func5), "public");

    strictEqual(getAccess(runner.context, Test1), "internal");
    strictEqual(getAccess(runner.context, Test2), "internal");
    strictEqual(getAccess(runner.context, Test3), "public");
    strictEqual(getAccess(runner.context, Test4), "internal");
    strictEqual(getAccess(runner.context, Test5), "internal");
    strictEqual(getAccess(runner.context, Test6), "public");
  });

  it("access propagation for properties, base models and sub models", async () => {
    const {
      Fish,
      Salmon,
      Origin,
      BaseModel,
      ModelA,
      ModelB,
      ModelC,
      ModelD,
      ModelE,
      ModelF,
      EnumA,
      func1,
      func2,
      func3,
      func4,
    } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @discriminator("kind")
          @test
          model Fish {
            age: int32;
          }

          @test
          model Origin {
            country: string;
            city: string;
            manufacture: string;
          }

          @test
          model Salmon extends Fish {
            kind: "salmon";
            origin: Origin;
          }

          @test
          model BaseModel {
            base: string;
          }

          @test
          model ModelA extends BaseModel {
            prop1: ModelB;
            prop2: ModelC[];
            prop3: Record<ModelD>;
            prop4: EnumA;
            prop5: ModelE | ModelF;
          }

          @test
          model ModelB {
            prop: string;
          }

          @test
          model ModelC {
            prop: string;
          }

          @test
          model ModelD {
            prop: string;
          }

          @test
          model ModelE {
            prop: string;
          }

          @test
          model ModelF {
            prop: string;
          }

          @test
          enum EnumA {
            one,
            two,
            three,
          }

          @test
          @access(Access.internal)
          @route("/func1")
          op func1(
            @body body: Fish
          ): void;
          @test
          @route("/func2")
          op func2(
            @body body: Fish
          ): void;

          @test
          @access(Access.internal)
          @route("/func3")
          op func3(
            @body body: ModelA
          ): void;
          @test
          @route("/func4")
          op func4(
            @body body: ModelA
          ): void;
        }
      `)) as {
      Fish: Model;
      Salmon: Model;
      Origin: Model;
      BaseModel: Model;
      ModelA: Model;
      ModelB: Model;
      ModelC: Model;
      ModelD: Model;
      ModelE: Model;
      ModelF: Model;
      EnumA: Model;
      func1: Operation;
      func2: Operation;
      func3: Operation;
      func4: Operation;
    };

    strictEqual(getAccess(runner.context, func1), "internal");
    strictEqual(getAccess(runner.context, func2), "public");
    strictEqual(getAccess(runner.context, func3), "internal");
    strictEqual(getAccess(runner.context, func4), "public");

    strictEqual(getAccess(runner.context, Fish), "public");
    strictEqual(getAccess(runner.context, Salmon), "public");
    strictEqual(getAccess(runner.context, Origin), "public");
    strictEqual(getAccess(runner.context, BaseModel), "public");
    strictEqual(getAccess(runner.context, ModelA), "public");
    strictEqual(getAccess(runner.context, ModelB), "public");
    strictEqual(getAccess(runner.context, ModelC), "public");
    strictEqual(getAccess(runner.context, ModelD), "public");
    strictEqual(getAccess(runner.context, ModelE), "public");
    strictEqual(getAccess(runner.context, ModelF), "public");
    strictEqual(getAccess(runner.context, EnumA), "public");
  });

  it("access propagation with override", async () => {
    const {
      Test1,
      Test2,
      Test3,
      Test4,
      Test5,
      func1,
      func2,
      func3,
      func4,
      func5,
      func6,
      func7,
      func8,
    } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          model Test1 {
          }
          @test
          @access(Access.internal)
          @route("/func1")
          op func1(
            @body body: Test1
          ): void;

          @test
          model Test2 {
          }
          @test
          @route("/func2")
          op func2(
            @body body: Test2
          ): void;

          @test
          model Test3 {
          }
          @test
          @access(Access.public)
          @route("/func3")
          op func3(
            @body body: Test3
          ): void;


          @test
          model Test4 {
          }
          @test
          @access(Access.internal)
          @route("/func4")
          op func4(
            @body body: Test4
          ): void;
          @test
          @route("/func5")
          op func5(
            @body body: Test4
          ): void;

          @test
          model Test5 {
          }
          @test
          @access(Access.internal)
          @route("/func6")
          op func6(
            @body body: Test5
          ): void;
          @test
          @route("/func7")
          op func7(
            @body body: Test5
          ): void;
          @test
          @access(Access.public)
          @route("/func8")
          op func8(
            @body body: Test5
          ): void;
        }
      `)) as {
      Test1: Model;
      Test2: Model;
      Test3: Model;
      Test4: Model;
      Test5: Model;
      func1: Operation;
      func2: Operation;
      func3: Operation;
      func4: Operation;
      func5: Operation;
      func6: Operation;
      func7: Operation;
      func8: Operation;
    };

    strictEqual(getAccess(runner.context, func1), "internal");
    strictEqual(getAccess(runner.context, func2), "public");
    strictEqual(getAccess(runner.context, func3), "public");
    strictEqual(getAccess(runner.context, func4), "internal");
    strictEqual(getAccess(runner.context, func5), "public");
    strictEqual(getAccess(runner.context, func6), "internal");
    strictEqual(getAccess(runner.context, func7), "public");
    strictEqual(getAccess(runner.context, func8), "public");

    strictEqual(getAccess(runner.context, Test1), "internal");
    strictEqual(getAccess(runner.context, Test2), "public");
    strictEqual(getAccess(runner.context, Test3), "public");
    strictEqual(getAccess(runner.context, Test4), "public");
    strictEqual(getAccess(runner.context, Test5), "public");
  });

  it("access propagation with nullable", async () => {
    await runner.compileWithBuiltInService(
      `
        model RunStep {
          id: string;
          lastError: RunStepError | null;
        }

        model RunStepError {
          code: string;
          message: string;
        }

        @get
        @route("/threads/{threadId}/runs/{runId}/steps/{stepId}")
        op getRunStep(
          @path threadId: string,
          @path runId: string,
          @path stepId: string,
        ): RunStep;

        @get
        @route("/threads/{threadId}/runs/{runId}/steps")
        op listRunSteps(
          @path threadId: string,
          @path runId: string,
        ): RunStep[];
        @@access(listRunSteps, Access.internal);
        `,
    );
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    strictEqual(models[0].access, "public");
    strictEqual(models[1].access, "public");
  });

  it("access conflict from operation", async () => {
    await runner.compileWithBuiltInService(
      `
        @access(Access.internal)
        model A {}

        op test(@body body: A): void;
        `,
    );
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].access, "public");
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/conflict-access-override",
    });
  });

  it("access conflict from propagation", async () => {
    await runner.compileWithBuiltInService(
      `
        model A {
          prop: B;
        }

        @access(Access.internal)
        model B {}

        op test(@body body: A): void;
        `,
    );
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    strictEqual(models[0].access, "public");
    strictEqual(models[1].access, "public");
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/conflict-access-override",
    });
  });

  it("access conflict from other override", async () => {
    await runner.compileWithBuiltInService(
      `
        model A {
          prop: B;
        }

        model B {}

        @access(Access.internal)
        @usage(Usage.input)
        model C {
          prop: B;
        }

        op test(@body body: A): void;
        `,
    );
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 3);
    strictEqual(models[0].access, "public");
    strictEqual(models[1].access, "public");
    strictEqual(models[2].access, "internal");
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/conflict-access-override",
    });
  });

  it("access conflict from multiple override", async () => {
    await runner.compileWithBuiltInService(
      `
        model A {
          x: X;
        }

        model B {
          x: X;
        }

        @access(Access.internal)
        model X {
        }

        @access(Access.internal)
        op one(...B): B;

        @access(Access.internal)
        op two(): B;
        `,
    );
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    strictEqual(models.find((m) => m.name === "B")?.access, "internal");
    strictEqual(models.find((m) => m.name === "X")?.access, "public");
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/conflict-access-override",
    });
  });

  it("disableUsageAccessPropagationToBase true with override", async () => {
    runner = await createSdkTestRunner(
      { emitterName: "@azure-tools/typespec-python" },
      { disableUsageAccessPropagationToBase: true },
    );
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
        @@access(DerivedOne, Access.public);
      `,
    );
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    strictEqual(models[0].access, "public");
    strictEqual(models[0].name, "DerivedOne");
    strictEqual(models[1].access, "public");
    strictEqual(models[1].name, "UsedByProperty");
  });

  it("disableUsageAccessPropagationToBase true", async () => {
    runner = await createSdkTestRunner(
      { emitterName: "@azure-tools/typespec-python" },
      { disableUsageAccessPropagationToBase: true },
    );
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
    strictEqual(models[0].access, "public");
    strictEqual(models[0].name, "DerivedOne");
    strictEqual(models[1].access, "public");
    strictEqual(models[1].name, "UsedByProperty");
  });
});

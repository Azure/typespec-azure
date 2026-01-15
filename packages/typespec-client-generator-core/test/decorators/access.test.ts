import { Model } from "@typespec/compiler";
import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { describe, it } from "vitest";
import { getAccess } from "../../src/decorators.js";
import {
  createSdkContextForTester,
  SimpleTester,
  SimpleTesterWithBuiltInService,
} from "../tester.js";

describe("namespace access override", () => {
  it("should inherit access from parent namespace", async () => {
    const { Test, program } = await SimpleTester.compile(t.code`
      @access(Access.public)
      @service(#{title: "Test Service"}) namespace TestService;
      ${t.model("Test")}
      model Test {
        prop: string;
      }
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const actual = getAccess(context, Test);
    strictEqual(actual, "public");
  });

  it("should tag anonymous models with default access", async () => {
    const { Test, prop, program } = await SimpleTester.compile(t.code`
      @access(Access.public)
      @service(#{title: "Test Service"}) namespace TestService;
      ${t.model("Test")}
      model Test {
        ${t.modelProperty("prop")}
        prop: {
            foo: string;
        }
      }
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const actual = getAccess(context, Test);
    const actualAnonymous = getAccess(context, prop.type as Model);
    strictEqual(actual, "public");
    strictEqual(actualAnonymous, "public");
  });

  it("should tag as internal anonymous models with default access", async () => {
    const { Test, prop, program } = await SimpleTester.compile(t.code`
      @access(Access.internal)
      @service(#{title: "Test Service"}) namespace TestService;
      ${t.model("Test")}
      model Test {
        ${t.modelProperty("prop")}
        prop: {
            foo: string;
        }
      }
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const actual = getAccess(context, Test);
    const actualAnonymous = getAccess(context, prop.type as Model);
    strictEqual(actual, "internal");
    strictEqual(actualAnonymous, "internal");
  });

  it("should honor the granular override over the namespace one", async () => {
    const { Test, program } = await SimpleTester.compile(t.code`
      @access(Access.public)
      @service(#{title: "Test Service"}) namespace TestService;
      @access(Access.internal)
      ${t.model("Test")}
      model Test {
        prop: string;
      }
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const actual = getAccess(context, Test);
    strictEqual(actual, "internal");
  });

  it("locally mark an operation as internal", async () => {
    const { test, program } = await SimpleTester.compile(t.code`
      @access(Access.public)
      @service(#{title: "Test Service"}) namespace TestService;
      @access(Access.internal)
      op ${t.op("test")}(): void;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const actual = getAccess(context, test);
    strictEqual(actual, "internal");
  });

  it("locally mark an operation as public", async () => {
    const { test, program } = await SimpleTester.compile(t.code`
      @access(Access.public)
      @service(#{title: "Test Service"}) namespace TestService;
      op ${t.op("test")}(): void;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const actual = getAccess(context, test);
    strictEqual(actual, "public");
  });

  it("mark an operation as internal through the namespace", async () => {
    const { test, program } = await SimpleTester.compile(t.code`
      @access(Access.internal)
      @service(#{title: "Test Service"}) namespace TestService;
      op ${t.op("test")}(): void;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const actual = getAccess(context, test);
    strictEqual(actual, "internal");
  });
});

it("default calculated value of operation is undefined, default value of calculated model is undefined", async () => {
  const { test, Test, program } = await SimpleTester.compile(t.code`
    ${t.model("Test")}
    model Test{}

    op ${t.op("test")}(): void;
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getAccess(context, test), "public");
  strictEqual(getAccess(context, Test), "public");
});

it("model access calculated by operation", async () => {
  const { Test, func, program } = await SimpleTester.compile(t.code`
    @service
    namespace MyService {
      ${t.model("Test")}
      model Test {
        prop: string;
      }
      @access(Access.internal)
      op ${t.op("func")}(
        @body body: Test
      ): void;
    }
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  let actual = getAccess(context, Test);
  strictEqual(actual, "internal");
  actual = getAccess(context, func);
  strictEqual(actual, "internal");
});

it("override calculated model with public access", async () => {
  const { Test, func, program } = await SimpleTester.compile(t.code`
    @service
    namespace MyService {
      @access(Access.public)
      ${t.model("Test")}
      model Test {
        prop: string;
      }
      @access(Access.internal)
      op ${t.op("func")}(
        @body body: Test
      ): void;
    }
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  let actual = getAccess(context, Test);
  strictEqual(actual, "public");
  actual = getAccess(context, func);
  strictEqual(actual, "internal");
});

it("override calculated model with internal access", async () => {
  const { Test, func, program } = await SimpleTester.compile(t.code`
    @service
    namespace MyService {
      @access(Access.internal) // This is an incorrect usage. We will have linter to ban.
      ${t.model("Test")}
      model Test {
        prop: string;
      }
      op ${t.op("func")}(
        @body body: Test
      ): void;
    }
    `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getAccess(context, Test), "internal");
  strictEqual(getAccess(context, func), "public");
});

it("access propagation", async () => {
  const { Fish, Shark, Salmon, SawShark, Origin, program } = await SimpleTester.compile(t.code`
    @service
    namespace MyService {
      @discriminator("kind")
      ${t.model("Fish")}
      model Fish {
        age: int32;
      }

      @discriminator("sharktype")
      ${t.model("Shark")}
      model Shark extends Fish {
        kind: "shark";
        origin: Origin;
      }

      ${t.model("Salmon")}
      model Salmon extends Fish {
        kind: "salmon";
      }

      ${t.model("SawShark")}
      model SawShark extends Shark {
        sharktype: "saw";
      }

      ${t.model("Origin")}
      model Origin {
        country: string;
        city: string;
        manufacture: string;
      }

      @get
      @access(Access.internal)
      op getModel(): Fish;
    }
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  let actual = getAccess(context, Fish);
  strictEqual(actual, "internal");
  actual = getAccess(context, Shark);
  strictEqual(actual, "internal");
  actual = getAccess(context, Salmon);
  strictEqual(actual, "internal");
  actual = getAccess(context, SawShark);
  strictEqual(actual, "internal");
  actual = getAccess(context, Origin);
  strictEqual(actual, "internal");
});

it("complicated access propagation", async () => {
  const { Test1, Test2, Test3, Test4, Test5, Test6, func1, func2, func3, func4, func5, program } =
    await SimpleTester.compile(t.code`
      @service
      namespace MyService {
        ${t.model("Test1")}
        model Test1 {
          prop: Test2;
        }
        ${t.model("Test2")}
        model Test2 {
          prop: string;
        }
        @access(Access.internal)
        @route("/func1")
        op ${t.op("func1")}(
          @body body: Test1
        ): void;

        ${t.model("Test3")}
        model Test3 {
          prop: string;
        }
        @access(Access.internal)
        @route("/func2")
        op ${t.op("func2")}(
          @body body: Test3
        ): void;
        @route("/func3")
        op ${t.op("func3")}(
          @body body: Test3
        ): void;

        ${t.model("Test4")}
        model Test4 {
          prop: Test5;
        }
        ${t.model("Test5")}
        model Test5 {
          prop: Test6;
        }
        ${t.model("Test6")}
        model Test6 {
          prop: string;
        }
        @access(Access.internal)
        @route("/func4")
        op ${t.op("func4")}(
          @body body: Test4
        ): void;
        @route("/func5")
        op ${t.op("func5")}(
          @body body: Test6
        ): void;
      }
    `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getAccess(context, func1), "internal");
  strictEqual(getAccess(context, func2), "internal");
  strictEqual(getAccess(context, func3), "public");
  strictEqual(getAccess(context, func4), "internal");
  strictEqual(getAccess(context, func5), "public");

  strictEqual(getAccess(context, Test1), "internal");
  strictEqual(getAccess(context, Test2), "internal");
  strictEqual(getAccess(context, Test3), "public");
  strictEqual(getAccess(context, Test4), "internal");
  strictEqual(getAccess(context, Test5), "internal");
  strictEqual(getAccess(context, Test6), "public");
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
    program,
  } = await SimpleTester.compile(t.code`
    @service
    namespace MyService {
      @discriminator("kind")
      ${t.model("Fish")}
      model Fish {
        age: int32;
      }

      ${t.model("Origin")}
      model Origin {
        country: string;
        city: string;
        manufacture: string;
      }

      ${t.model("Salmon")}
      model Salmon extends Fish {
        kind: "salmon";
        origin: Origin;
      }

      ${t.model("BaseModel")}
      model BaseModel {
        base: string;
      }

      ${t.model("ModelA")}
      model ModelA extends BaseModel {
        prop1: ModelB;
        prop2: ModelC[];
        prop3: Record<ModelD>;
        prop4: EnumA;
        prop5: ModelE | ModelF;
      }

      ${t.model("ModelB")}
      model ModelB {
        prop: string;
      }

      ${t.model("ModelC")}
      model ModelC {
        prop: string;
      }

      ${t.model("ModelD")}
      model ModelD {
        prop: string;
      }

      ${t.model("ModelE")}
      model ModelE {
        prop: string;
      }

      ${t.model("ModelF")}
      model ModelF {
        prop: string;
      }

      ${t.enum("EnumA")}
      enum EnumA {
        one,
        two,
        three,
      }

      @access(Access.internal)
      @route("/func1")
      op ${t.op("func1")}(
        @body body: Fish
      ): void;
      @route("/func2")
      op ${t.op("func2")}(
        @body body: Fish
      ): void;

      @access(Access.internal)
      @route("/func3")
      op ${t.op("func3")}(
        @body body: ModelA
      ): void;
      @route("/func4")
      op ${t.op("func4")}(
        @body body: ModelA
      ): void;
    }
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getAccess(context, func1), "internal");
  strictEqual(getAccess(context, func2), "public");
  strictEqual(getAccess(context, func3), "internal");
  strictEqual(getAccess(context, func4), "public");

  strictEqual(getAccess(context, Fish), "public");
  strictEqual(getAccess(context, Salmon), "public");
  strictEqual(getAccess(context, Origin), "public");
  strictEqual(getAccess(context, BaseModel), "public");
  strictEqual(getAccess(context, ModelA), "public");
  strictEqual(getAccess(context, ModelB), "public");
  strictEqual(getAccess(context, ModelC), "public");
  strictEqual(getAccess(context, ModelD), "public");
  strictEqual(getAccess(context, ModelE), "public");
  strictEqual(getAccess(context, ModelF), "public");
  strictEqual(getAccess(context, EnumA), "public");
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
    program,
  } = await SimpleTester.compile(t.code`
      @service
      namespace MyService {
        ${t.model("Test1")}
        model Test1 {
        }
        @access(Access.internal)
        @route("/func1")
        op ${t.op("func1")}(
          @body body: Test1
        ): void;

        ${t.model("Test2")}
        model Test2 {
        }
        @route("/func2")
        op ${t.op("func2")}(
          @body body: Test2
        ): void;

        ${t.model("Test3")}
        model Test3 {
        }
        @access(Access.public)
        @route("/func3")
        op ${t.op("func3")}(
          @body body: Test3
        ): void;


        ${t.model("Test4")}
        model Test4 {
        }
        @access(Access.internal)
        @route("/func4")
        op ${t.op("func4")}(
          @body body: Test4
        ): void;
        @route("/func5")
        op ${t.op("func5")}(
          @body body: Test4
        ): void;

        ${t.model("Test5")}
        model Test5 {
        }
        @access(Access.internal)
        @route("/func6")
        op ${t.op("func6")}(
          @body body: Test5
        ): void;
        @route("/func7")
        op ${t.op("func7")}(
          @body body: Test5
        ): void;
        @access(Access.public)
        @route("/func8")
        op ${t.op("func8")}(
          @body body: Test5
        ): void;
      }
    `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getAccess(context, func1), "internal");
  strictEqual(getAccess(context, func2), "public");
  strictEqual(getAccess(context, func3), "public");
  strictEqual(getAccess(context, func4), "internal");
  strictEqual(getAccess(context, func5), "public");
  strictEqual(getAccess(context, func6), "internal");
  strictEqual(getAccess(context, func7), "public");
  strictEqual(getAccess(context, func8), "public");

  strictEqual(getAccess(context, Test1), "internal");
  strictEqual(getAccess(context, Test2), "public");
  strictEqual(getAccess(context, Test3), "public");
  strictEqual(getAccess(context, Test4), "public");
  strictEqual(getAccess(context, Test5), "public");
});

it("access propagation with nullable", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(t.code`
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
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  strictEqual(models[0].access, "public");
  strictEqual(models[1].access, "public");
});

it("access conflict from operation", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(t.code`
    @access(Access.internal)
    model A {}

    op test(@body body: A): void;
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 1);
  strictEqual(models[0].access, "public");
  expectDiagnostics(context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/conflict-access-override",
  });
});

it("access conflict from propagation", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(t.code`
    model A {
      prop: B;
    }

    @access(Access.internal)
    model B {}

    op test(@body body: A): void;
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  strictEqual(models[0].access, "public");
  strictEqual(models[1].access, "public");
  expectDiagnostics(context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/conflict-access-override",
  });
});

it("access conflict from other override", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(t.code`
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
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 3);
  strictEqual(models[0].access, "public");
  strictEqual(models[1].access, "public");
  strictEqual(models[2].access, "internal");
  expectDiagnostics(context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/conflict-access-override",
  });
});

it("access conflict from multiple override", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(t.code`
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
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  strictEqual(models.find((m) => m.name === "B")?.access, "internal");
  strictEqual(models.find((m) => m.name === "X")?.access, "public");
  expectDiagnostics(context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/conflict-access-override",
  });
});

it("disableUsageAccessPropagationToBase true with override", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(t.code`
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
  `);

  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-python" },
    { disableUsageAccessPropagationToBase: true },
  );
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  strictEqual(models[0].access, "public");
  strictEqual(models[0].name, "DerivedOne");
  strictEqual(models[1].access, "public");
  strictEqual(models[1].name, "UsedByProperty");
});

it("disableUsageAccessPropagationToBase true", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(t.code`
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

    @access(Access.internal)
    op test(): DerivedOne;
  `);

  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-python" },
    { disableUsageAccessPropagationToBase: true },
  );
  const models = context.sdkPackage.models;
  strictEqual(models.length, 2);
  strictEqual(models[0].access, "internal");
  strictEqual(models[0].name, "DerivedOne");
  strictEqual(models[1].access, "internal");
  strictEqual(models[1].name, "UsedByProperty");
});

it("disableUsageAccessPropagationToBase true property propagation", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(t.code`
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

    @access(Access.internal)
    op test(): DerivedOne;
  `);

  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-python" },
    { disableUsageAccessPropagationToBase: true },
  );
  const models = context.sdkPackage.models;
  strictEqual(models.length, 3);
  strictEqual(models[0].access, "internal");
  strictEqual(models[0].name, "DerivedOne");
  strictEqual(models[1].access, "internal");
  strictEqual(models[1].name, "UsedByProperty");
  strictEqual(models[2].access, "internal");
  strictEqual(models[2].name, "UsedByBaseProperty");
});

it("disableUsageAccessPropagationToBase true discriminator propagation", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(t.code`
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
    @access(Access.internal)
    op getModel(): Fish;
  `);

  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-python" },
    { disableUsageAccessPropagationToBase: true },
  );
  const models = context.sdkPackage.models;
  strictEqual(models.length, 5);
  strictEqual(models[0].access, "internal");
  strictEqual(models[0].name, "Fish");
  strictEqual(models[1].access, "internal");
  strictEqual(models[1].name, "Shark");
  strictEqual(models[2].access, "internal");
  strictEqual(models[2].name, "Origin");
  strictEqual(models[3].access, "internal");
  strictEqual(models[3].name, "SawShark");
  strictEqual(models[4].access, "internal");
  strictEqual(models[4].name, "Salmon");
});

describe("model property access", () => {
  it("normal model property", async () => {
    const { program } = await SimpleTesterWithBuiltInService.compile(t.code`
      model Test {
        prop: string;
      }

      op test(@body body: Test): void;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = context.sdkPackage.models;
    strictEqual(models[0].properties[0].access, "public");
  });

  it("normal parameter", async () => {
    const { program } = await SimpleTesterWithBuiltInService.compile(t.code`
      op test(a: string): void;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const parameters = context.sdkPackage.clients[0].methods[0].parameters;
    strictEqual(parameters[0].access, "public");
  });

  it("model property with override", async () => {
    const { program } = await SimpleTesterWithBuiltInService.compile(t.code`
      model Test {
        @access(Access.internal)
        prop: string;
      }

      op test(@body body: Test): void;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = context.sdkPackage.models;
    strictEqual(models[0].properties[0].access, "internal");
  });

  it("parameter with override", async () => {
    const { program } = await SimpleTesterWithBuiltInService.compile(t.code`
      op test(@access(Access.internal) a: string): void;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const parameters = context.sdkPackage.clients[0].methods[0].parameters;
    strictEqual(parameters[0].access, "internal");
  });

  it("model property with override propagation", async () => {
    const { program } = await SimpleTesterWithBuiltInService.compile(t.code`
      model Foo {
        @access(Access.internal)
        foo: Bar;

        @access(Access.internal)
        baz: Baz;
      }

      model Bar {
        prop: string;
      }

      model Baz {
        prop: string
      }

      op test(@body body: Foo): Baz;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = context.sdkPackage.models;
    strictEqual(models[0].properties[0].access, "internal");
    strictEqual(models[0].properties[1].access, "internal");
    strictEqual(models[1].access, "internal");
    strictEqual(models[2].access, "public");
  });
});

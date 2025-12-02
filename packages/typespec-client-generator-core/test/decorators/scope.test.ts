import { Model, Operation } from "@typespec/compiler";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { getAccess } from "../../src/decorators.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("emitter with same scope as decorator", async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
  const { func } = (await runner.compile(`
    @test
    @access(Access.internal, "csharp")
    op func(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `)) as { func: Operation };

  const actual = getAccess(runner.context, func);
  strictEqual(actual, "internal");
});

it("emitter different scope from decorator", async () => {
  const code = `
    @test
    @access(Access.internal, "csharp")
    op func(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `;
  const { func } = (await runner.compile(code)) as { func: Operation };
  strictEqual(getAccess(runner.context, func), "public");

  const runnerWithCsharp = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });
  const { func: funcCsharp } = (await runnerWithCsharp.compile(code)) as { func: Operation };
  strictEqual(getAccess(runnerWithCsharp.context, funcCsharp), "internal");
});

it("emitter first in decorator scope list", async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  const { func } = (await runner.compile(`
    @test
    @access(Access.internal, "java")
    @access(Access.internal, "csharp")
    op func(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `)) as { func: Operation };

  const actual = getAccess(runner.context, func);
  strictEqual(actual, "internal");
});

it("emitter second in decorator scope list", async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
  const { func } = (await runner.compile(`
    @test
    @access(Access.internal, "java")
    @access(Access.internal, "csharp")
    op func(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `)) as { func: Operation };

  const actual = getAccess(runner.context, func);
  strictEqual(actual, "internal");
});

it("emitter excluded from decorator scope list", async () => {
  const code = `
    @test
    @access(Access.internal, "java")
    @access(Access.internal, "csharp")
    op func(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `;
  const { func } = (await runner.compile(code)) as { func: Operation };

  strictEqual(getAccess(runner.context, func), "public");
  const runnerWithJava = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-java",
  });
  const { func: funcJava } = (await runnerWithJava.compile(code)) as { func: Operation };
  strictEqual(getAccess(runnerWithJava.context, funcJava), "internal");
});

it("no scope decorator", async () => {
  const runnerWithCSharp = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });
  await runnerWithCSharp.compile(`
      @service
      namespace MyService {
        model Test {
          prop: string;
        }
        op func(
          @body body: Test
        ): void;
      }
    `);

  const sdkPackage = runnerWithCSharp.context.sdkPackage;
  const client = sdkPackage.clients.find((x) => x.methods.find((m) => m.name === "func"));
  const model = sdkPackage.models.find((x) => x.name === "Test");
  ok(client);
  ok(model);
});

it("first non-scoped decorator then scoped decorator", async () => {
  const code = `
    @test
    @access(Access.public, "csharp")
    @access(Access.internal)
    op func(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `;

  const { func } = (await runner.compile(code)) as { func: Operation };
  strictEqual(getAccess(runner.context, func), "internal");

  const runnerWithCsharp = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });
  const { func: funcCsharp } = (await runnerWithCsharp.compile(code)) as { func: Operation };
  strictEqual(getAccess(runnerWithCsharp.context, funcCsharp), "public");
});

it("first scoped decorator then non-scoped decorator", async () => {
  const code = `
    @test
    @access(Access.internal)
    @access(Access.public, "csharp")
    op func(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `;

  const { func } = (await runner.compile(code)) as { func: Operation };
  strictEqual(getAccess(runner.context, func), "internal");

  const runnerWithCsharp = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });
  const { func: funcCsharp } = (await runnerWithCsharp.compile(code)) as { func: Operation };
  strictEqual(getAccess(runnerWithCsharp.context, funcCsharp), "public");
});

it("first non-scoped augmented decorator then scoped augmented decorator", async () => {
  const code = `
    @test
    op func(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;

    @@access(func, Access.public);
    @@access(func, Access.internal, "csharp"); 
  `;

  const { func } = (await runner.compile(code)) as { func: Operation };
  strictEqual(getAccess(runner.context, func), "public");

  const runnerWithCsharp = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });
  const { func: funcCsharp } = (await runnerWithCsharp.compile(code)) as { func: Operation };
  strictEqual(getAccess(runnerWithCsharp.context, funcCsharp), "internal");
});

it("first scoped augmented decorator then non-scoped augmented decorator", async () => {
  const code = `
    @test
    op func(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;

    @@access(func, Access.internal, "csharp");
    @@access(func, Access.public);
  `;

  const { func } = (await runner.compile(code)) as { func: Operation };
  strictEqual(getAccess(runner.context, func), "public");

  const runnerWithCsharp = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });
  const { func: funcCsharp } = (await runnerWithCsharp.compile(code)) as { func: Operation };
  strictEqual(getAccess(runnerWithCsharp.context, funcCsharp), "internal");
});

it("two scoped decorators", async () => {
  const code = `
    @test
    @access(Access.internal, "csharp")
    @access(Access.internal, "python")
    op func(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `;

  const { func } = (await runner.compile(code)) as { func: Operation };
  strictEqual(getAccess(runner.context, func), "internal");

  const runnerWithCsharp = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });
  const { func: funcCsharp } = (await runnerWithCsharp.compile(code)) as { func: Operation };
  strictEqual(getAccess(runnerWithCsharp.context, funcCsharp), "internal");
});

it("two non-scoped decorators", async () => {
  const code = `
    @test
    @access(Access.internal)
    @access(Access.public)
    op func(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `;

  const { func } = (await runner.compile(code)) as { func: Operation };
  strictEqual(getAccess(runner.context, func), "internal");

  const runnerWithCsharp = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });
  const { func: funcCsharp } = (await runnerWithCsharp.compile(code)) as { func: Operation };
  strictEqual(getAccess(runnerWithCsharp.context, funcCsharp), "internal");
});

it("csv scope list", async () => {
  function getCodeTemplate(language: string) {
    return `
      @test
      @access(Access.internal, "${language}")
      model Test {
        prop: string;
      }
      `;
  }
  const pythonRunner = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-python",
  });
  const javaRunner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  const csharpRunner = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });

  const testCode = getCodeTemplate("python,csharp");
  const { Test: TestPython } = (await pythonRunner.compile(testCode)) as { Test: Model };
  strictEqual(getAccess(pythonRunner.context, TestPython), "internal");

  const { Test: TestCSharp } = (await csharpRunner.compile(testCode)) as { Test: Model };
  strictEqual(getAccess(csharpRunner.context, TestCSharp), "internal");

  const { Test: TestJava } = (await javaRunner.compile(testCode)) as { Test: Model };
  strictEqual(getAccess(javaRunner.context, TestJava), "public");
});

it("csv scope list augment", async () => {
  function getCodeTemplate(language: string) {
    return `
      @test
      model Test {
        prop: string;
      }

      @@access(Test, Access.public, "java, ts");
      @@access(Test, Access.internal, "${language}");
      `;
  }
  const pythonRunner = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-python",
  });
  const javaRunner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  const csharpRunner = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });

  const testCode = getCodeTemplate("python,csharp");
  const { Test: TestPython } = (await pythonRunner.compile(testCode)) as { Test: Model };
  strictEqual(getAccess(pythonRunner.context, TestPython), "internal");

  const { Test: TestCSharp } = (await csharpRunner.compile(testCode)) as { Test: Model };
  strictEqual(getAccess(csharpRunner.context, TestCSharp), "internal");

  const { Test: TestJava } = (await javaRunner.compile(testCode)) as { Test: Model };
  strictEqual(getAccess(javaRunner.context, TestJava), "public");
});

it("include operation from csharp client", async () => {
  const runnerWithCSharp = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });
  await runnerWithCSharp.compile(`
      @service
      namespace MyService {
        model Test {
          prop: string;
        }
        @scope("csharp")
        op func(
          @body body: Test
        ): void;
      }
    `);

  const sdkPackage = runnerWithCSharp.context.sdkPackage;
  const client = sdkPackage.clients.find((x) => x.methods.find((m) => m.name === "func"));
  const model = sdkPackage.models.find((x) => x.name === "Test");
  ok(client);
  ok(model);
});

it("include operation from only csharp client", async () => {
  const runnerWithCSharp = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-python",
  });
  await runnerWithCSharp.compile(`
      @service
      namespace MyService {
        model Test {
          prop: string;
        }
        @scope("csharp")
        op func(
          @body body: Test
        ): void;

        @route("/test")
        op test(
          @body body: Test
        ): void;
      }
    `);

  const sdkPackage = runnerWithCSharp.context.sdkPackage;
  const client = sdkPackage.clients[0];
  ok(client);
  strictEqual(client.methods.length, 1);
  strictEqual(client.methods[0].name, "test");
});

it("exclude operation from csharp client", async () => {
  const runnerWithCSharp = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });
  await runnerWithCSharp.compile(`
      @service
      namespace MyService {
        model Test {
          prop: string;
        }
        @scope("!csharp")
        op func(
          @body body: Test
        ): void;
      }
    `);

  const sdkPackage = runnerWithCSharp.context.sdkPackage;
  const client = sdkPackage.clients.find((x) => x.methods.find((m) => m.name === "func"));
  const model = sdkPackage.models.find((x) => x.name === "Test");
  strictEqual(client, undefined);
  strictEqual(model, undefined);
});

describe("negation", () => {
  it("single scope negation", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamed", "!csharp")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "Test");
    ok(testModel);
  });

  it("multiple scopes negation", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamed", "!(csharp, java)")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "Test");
    ok(testModel);
  });

  it("non-negation scope", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamed", "!(python, java)")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
    ok(testModel);
  });

  it("allow combination of negation scope and normal scope", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamed", "csharp, !java")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
    ok(testModel);
  });

  it("allow combination of negation scope and normal scope for the same scope", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamed", "!csharp, csharp")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
    ok(testModel);
  });

  it("allow combination of negation scope and normal scope for the same multiple scopes", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamed", "!csharp, csharp, python, !python, java")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
    ok(testModel);
  });

  it("allow multiple separated negation scopes", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamed", "!csharp, !java")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "Test");
    ok(testModel);
  });

  it("negation scope override normal scope", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamedAgain", "!python, !java")
          @clientName("TestRenamed", "csharp")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamedAgain");
    ok(testModel);
  });

  it("normal scope incrementally add", async () => {
    const tsp = `
        @service
        @test namespace MyService {
          @test
          @clientName("TestRenamedAgain", "csharp")
          @clientName("TestRenamed", "!python, !java")
          model Test {
            prop: string;
          }
          @test
          @access(Access.internal)
          op func(
            @body body: Test
          ): void;
        }
      `;
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(tsp);
    const csharpSdkPackage = runnerWithCSharp.context.sdkPackage;
    const csharpTestModel = csharpSdkPackage.models.find((x) => x.name === "TestRenamedAgain");
    ok(csharpTestModel);

    const runnerWithPython = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-python",
    });
    await runnerWithPython.compile(tsp);
    const pythonSdkPackage = runnerWithPython.context.sdkPackage;
    const pythonTestModel = pythonSdkPackage.models.find((x) => x.name === "Test");
    ok(pythonTestModel);
  });

  it("negation scope override negation scope", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamedAgain", "!python, !java")
          @clientName("TestRenamed", "!go")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamedAgain");
    ok(testModel);
  });

  it("negation scope override normal scope with the same scope", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamedAgain", "!csharp")
          @clientName("TestRenamed", "csharp")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
    ok(testModel);
  });

  it("normal scope override negation scope with the same scope", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
        @service
        namespace MyService {
          @clientName("TestRenamedAgain", "csharp")
          @clientName("TestRenamed", "!csharp")
          model Test {
            prop: string;
          }
          op func(
            @body body: Test
          ): void;
        }
      `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamedAgain");
    ok(testModel);
  });

  it("negation scope override", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    const runnerWithJava = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-java",
    });
    const spec = `
        @service
        namespace MyService {
          model Test {
            prop: string;
          }
          @scope("!java")
          @scope("!csharp")
          op func(
            @body body: Test
          ): void;
        }
      `;
    await runnerWithCSharp.compile(spec);
    const csharpSdkPackage = runnerWithCSharp.context.sdkPackage;
    const csharpSdkClient = csharpSdkPackage.clients.find((x) =>
      x.methods.find((m) => m.name === "func"),
    );
    const csharpSdkModel = csharpSdkPackage.models.find((x) => x.name === "Test");
    ok(csharpSdkClient);
    ok(csharpSdkModel);

    await runnerWithJava.compile(spec);
    const javaSdkPackage = runnerWithJava.context.sdkPackage;
    const javaSdkClient = javaSdkPackage.clients.find((x) =>
      x.methods.find((m) => m.name === "func"),
    );
    const javaSdkModel = javaSdkPackage.models.find((x) => x.name === "Test");
    strictEqual(javaSdkClient, undefined);
    strictEqual(javaSdkModel, undefined);
  });
});

describe("model property scope", () => {
  it("include property for matching scope", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
      @service
      namespace MyService {
        model TestModel {
          @scope("csharp")
          csharpProp: string;
          commonProp: string;
        }
        op func(
          @body body: TestModel
        ): void;
      }
    `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const model = sdkPackage.models.find((x) => x.name === "TestModel");
    ok(model);
    const csharpProp = model.properties.find((x) => x.name === "csharpProp");
    const commonProp = model.properties.find((x) => x.name === "commonProp");
    ok(csharpProp);
    ok(commonProp);
  });

  it("exclude property from non-matching scope", async () => {
    const runnerWithPython = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-python",
    });
    await runnerWithPython.compile(`
      @service
      namespace MyService {
        model TestModel {
          @scope("csharp")
          csharpProp: string;
          commonProp: string;
        }
        op func(
          @body body: TestModel
        ): void;
      }
    `);

    const sdkPackage = runnerWithPython.context.sdkPackage;
    const model = sdkPackage.models.find((x) => x.name === "TestModel");
    ok(model);
    const csharpProp = model.properties.find((x) => x.name === "csharpProp");
    const commonProp = model.properties.find((x) => x.name === "commonProp");
    strictEqual(csharpProp, undefined);
    ok(commonProp);
  });

  it("exclude property with negation scope", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
      @service
      namespace MyService {
        model TestModel {
          @scope("!csharp")
          internalProp: string;
          commonProp: string;
        }
        op func(
          @body body: TestModel
        ): void;
      }
    `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const model = sdkPackage.models.find((x) => x.name === "TestModel");
    ok(model);
    const internalProp = model.properties.find((x) => x.name === "internalProp");
    const commonProp = model.properties.find((x) => x.name === "commonProp");
    strictEqual(internalProp, undefined);
    ok(commonProp);
  });

  it("include all properties without scope decorator", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
      @service
      namespace MyService {
        model TestModel {
          prop1: string;
          prop2: int32;
        }
        op func(
          @body body: TestModel
        ): void;
      }
    `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const model = sdkPackage.models.find((x) => x.name === "TestModel");
    ok(model);
    strictEqual(model.properties.length, 2);
  });

  it("multiple properties with different scopes", async () => {
    const runnerWithCSharp = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-csharp",
    });
    await runnerWithCSharp.compile(`
      @service
      namespace MyService {
        model TestModel {
          @scope("csharp")
          csharpProp: string;
          @scope("python")
          pythonProp: string;
          @scope("java")
          javaProp: string;
          commonProp: string;
        }
        op func(
          @body body: TestModel
        ): void;
      }
    `);

    const sdkPackage = runnerWithCSharp.context.sdkPackage;
    const model = sdkPackage.models.find((x) => x.name === "TestModel");
    ok(model);
    const csharpProp = model.properties.find((x) => x.name === "csharpProp");
    const pythonProp = model.properties.find((x) => x.name === "pythonProp");
    const javaProp = model.properties.find((x) => x.name === "javaProp");
    const commonProp = model.properties.find((x) => x.name === "commonProp");
    ok(csharpProp);
    strictEqual(pythonProp, undefined);
    strictEqual(javaProp, undefined);
    ok(commonProp);
  });
});

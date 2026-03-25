import { t } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { getAccess } from "../../src/decorators.js";
import { createSdkContextForTester, SimpleTester, SimpleTesterWithService } from "../tester.js";

it("emitter with same scope as decorator", async () => {
  const { program, func } = await SimpleTester.compile(t.code`
    @access(Access.internal, "csharp")
    op ${t.op("func")}(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  const actual = getAccess(context, func);
  strictEqual(actual, "internal");
});

it("emitter different scope from decorator", async () => {
  const code = t.code`
    @access(Access.internal, "csharp")
    op ${t.op("func")}(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `;
  const { program, func } = await SimpleTester.compile(code);
  const context = await createSdkContextForTester(program);
  strictEqual(getAccess(context, func), "public");

  const { program: programCsharp, func: funcCsharp } = await SimpleTester.compile(code);
  const contextCsharp = await createSdkContextForTester(programCsharp, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  strictEqual(getAccess(contextCsharp, funcCsharp), "internal");
});

it("emitter first in decorator scope list", async () => {
  const { program, func } = await SimpleTester.compile(t.code`
    @access(Access.internal, "java")
    @access(Access.internal, "csharp")
    op ${t.op("func")}(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
  });
  const actual = getAccess(context, func);
  strictEqual(actual, "internal");
});

it("emitter second in decorator scope list", async () => {
  const { program, func } = await SimpleTester.compile(t.code`
    @access(Access.internal, "java")
    @access(Access.internal, "csharp")
    op ${t.op("func")}(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  const actual = getAccess(context, func);
  strictEqual(actual, "internal");
});

it("emitter excluded from decorator scope list", async () => {
  const code = t.code`
    @access(Access.internal, "java")
    @access(Access.internal, "csharp")
    op ${t.op("func")}(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `;
  const { program, func } = await SimpleTester.compile(code);
  const context = await createSdkContextForTester(program);

  strictEqual(getAccess(context, func), "public");
  const { program: programJava, func: funcJava } = await SimpleTester.compile(code);
  const contextJava = await createSdkContextForTester(programJava, {
    emitterName: "@azure-tools/typespec-java",
  });
  strictEqual(getAccess(contextJava, funcJava), "internal");
});

it("no scope decorator", async () => {
  const { program } = await SimpleTester.compile(`
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

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients.find((x) => x.methods.find((m) => m.name === "func"));
  const model = sdkPackage.models.find((x) => x.name === "Test");
  ok(client);
  ok(model);
});

it("first non-scoped decorator then scoped decorator", async () => {
  const code = t.code`
    @access(Access.public, "csharp")
    @access(Access.internal)
    op ${t.op("func")}(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `;

  const { program, func } = await SimpleTester.compile(code);
  const context = await createSdkContextForTester(program);
  strictEqual(getAccess(context, func), "internal");

  const { program: programCsharp, func: funcCsharp } = await SimpleTester.compile(code);
  const contextCsharp = await createSdkContextForTester(programCsharp, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  strictEqual(getAccess(contextCsharp, funcCsharp), "public");
});

it("first scoped decorator then non-scoped decorator", async () => {
  const code = t.code`
    @access(Access.internal)
    @access(Access.public, "csharp")
    op ${t.op("func")}(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `;

  const { program, func } = await SimpleTester.compile(code);
  const context = await createSdkContextForTester(program);
  strictEqual(getAccess(context, func), "internal");

  const { program: programCsharp, func: funcCsharp } = await SimpleTester.compile(code);
  const contextCsharp = await createSdkContextForTester(programCsharp, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  strictEqual(getAccess(contextCsharp, funcCsharp), "public");
});

it("first non-scoped augmented decorator then scoped augmented decorator", async () => {
  const code = t.code`
    op ${t.op("func")}(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;

    @@access(func, Access.public);
    @@access(func, Access.internal, "csharp"); 
  `;

  const { program, func } = await SimpleTester.compile(code);
  const context = await createSdkContextForTester(program);
  strictEqual(getAccess(context, func), "public");

  const { program: programCsharp, func: funcCsharp } = await SimpleTester.compile(code);
  const contextCsharp = await createSdkContextForTester(programCsharp, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  strictEqual(getAccess(contextCsharp, funcCsharp), "internal");
});

it("first scoped augmented decorator then non-scoped augmented decorator", async () => {
  const code = t.code`
    op ${t.op("func")}(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;

    @@access(func, Access.internal, "csharp");
    @@access(func, Access.public);
  `;

  const { program, func } = await SimpleTester.compile(code);
  const context = await createSdkContextForTester(program);
  strictEqual(getAccess(context, func), "public");

  const { program: programCsharp, func: funcCsharp } = await SimpleTester.compile(code);
  const contextCsharp = await createSdkContextForTester(programCsharp, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  strictEqual(getAccess(contextCsharp, funcCsharp), "internal");
});

it("two scoped decorators", async () => {
  const code = t.code`
    @access(Access.internal, "csharp")
    @access(Access.internal, "python")
    op ${t.op("func")}(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `;

  const { program, func } = await SimpleTester.compile(code);
  const context = await createSdkContextForTester(program);
  strictEqual(getAccess(context, func), "internal");

  const { program: programCsharp, func: funcCsharp } = await SimpleTester.compile(code);
  const contextCsharp = await createSdkContextForTester(programCsharp, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  strictEqual(getAccess(contextCsharp, funcCsharp), "internal");
});

it("two non-scoped decorators", async () => {
  const code = t.code`
    @access(Access.internal)
    @access(Access.public)
    op ${t.op("func")}(
      @query("createdAt")
      createdAt: utcDateTime;
    ): void;
  `;

  const { program, func } = await SimpleTester.compile(code);
  const context = await createSdkContextForTester(program);
  strictEqual(getAccess(context, func), "internal");

  const { program: programCsharp, func: funcCsharp } = await SimpleTester.compile(code);
  const contextCsharp = await createSdkContextForTester(programCsharp, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  strictEqual(getAccess(contextCsharp, funcCsharp), "internal");
});

it("csv scope list", async () => {
  function getCodeTemplate(language: string) {
    return t.code`
      @access(Access.internal, "${language}")
      model ${t.model("Test")} {
        prop: string;
      }
      `;
  }

  const testCode = getCodeTemplate("python,csharp");
  const { program: programPython, Test: TestPython } = await SimpleTester.compile(testCode);
  const contextPython = await createSdkContextForTester(programPython, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getAccess(contextPython, TestPython), "internal");

  const { program: programCsharp, Test: TestCSharp } = await SimpleTester.compile(testCode);
  const contextCsharp = await createSdkContextForTester(programCsharp, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  strictEqual(getAccess(contextCsharp, TestCSharp), "internal");

  const { program: programJava, Test: TestJava } = await SimpleTester.compile(testCode);
  const contextJava = await createSdkContextForTester(programJava, {
    emitterName: "@azure-tools/typespec-java",
  });
  strictEqual(getAccess(contextJava, TestJava), "public");
});

it("csv scope list augment", async () => {
  function getCodeTemplate(language: string) {
    return t.code`
      model ${t.model("Test")} {
        prop: string;
      }

      @@access(Test, Access.public, "java, ts");
      @@access(Test, Access.internal, "${language}");
      `;
  }

  const testCode = getCodeTemplate("python,csharp");
  const { program: programPython, Test: TestPython } = await SimpleTester.compile(testCode);
  const contextPython = await createSdkContextForTester(programPython, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getAccess(contextPython, TestPython), "internal");

  const { program: programCsharp, Test: TestCSharp } = await SimpleTester.compile(testCode);
  const contextCsharp = await createSdkContextForTester(programCsharp, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  strictEqual(getAccess(contextCsharp, TestCSharp), "internal");

  const { program: programJava, Test: TestJava } = await SimpleTester.compile(testCode);
  const contextJava = await createSdkContextForTester(programJava, {
    emitterName: "@azure-tools/typespec-java",
  });
  strictEqual(getAccess(contextJava, TestJava), "public");
});

it("include operation from csharp client", async () => {
  const { program } = await SimpleTester.compile(`
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

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients.find((x) => x.methods.find((m) => m.name === "func"));
  const model = sdkPackage.models.find((x) => x.name === "Test");
  ok(client);
  ok(model);
});

it("include operation from only csharp client", async () => {
  const { program } = await SimpleTester.compile(`
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

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  ok(client);
  strictEqual(client.methods.length, 1);
  strictEqual(client.methods[0].name, "test");
});

it("exclude operation from csharp client", async () => {
  const { program } = await SimpleTester.compile(`
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

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients.find((x) => x.methods.find((m) => m.name === "func"));
  const model = sdkPackage.models.find((x) => x.name === "Test");
  strictEqual(client, undefined);
  strictEqual(model, undefined);
});

describe("negation", () => {
  it("single scope negation", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "Test");
    ok(testModel);
  });

  it("multiple scopes negation", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "Test");
    ok(testModel);
  });

  it("non-negation scope", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
    ok(testModel);
  });

  it("allow combination of negation scope and normal scope", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
    ok(testModel);
  });

  it("allow combination of negation scope and normal scope for the same scope", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
    ok(testModel);
  });

  it("allow combination of negation scope and normal scope for the same multiple scopes", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
    ok(testModel);
  });

  it("allow multiple separated negation scopes", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "Test");
    ok(testModel);
  });

  it("negation scope override normal scope", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamedAgain");
    ok(testModel);
  });

  it("normal scope incrementally add", async () => {
    const tsp = `
        @service
        namespace MyService {
          @clientName("TestRenamedAgain", "csharp")
          @clientName("TestRenamed", "!python, !java")
          model Test {
            prop: string;
          }
          @access(Access.internal)
          op func(
            @body body: Test
          ): void;
        }
      `;
    const { program: programCsharp } = await SimpleTester.compile(tsp);
    const contextCsharp = await createSdkContextForTester(programCsharp, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const csharpSdkPackage = contextCsharp.sdkPackage;
    const csharpTestModel = csharpSdkPackage.models.find((x) => x.name === "TestRenamedAgain");
    ok(csharpTestModel);

    const { program: programPython } = await SimpleTester.compile(tsp);
    const contextPython = await createSdkContextForTester(programPython, {
      emitterName: "@azure-tools/typespec-python",
    });
    const pythonSdkPackage = contextPython.sdkPackage;
    const pythonTestModel = pythonSdkPackage.models.find((x) => x.name === "Test");
    ok(pythonTestModel);
  });

  it("negation scope override negation scope", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamedAgain");
    ok(testModel);
  });

  it("negation scope override normal scope with the same scope", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamed");
    ok(testModel);
  });

  it("normal scope override negation scope with the same scope", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
    const testModel = sdkPackage.models.find((x) => x.name === "TestRenamedAgain");
    ok(testModel);
  });

  it("negation scope override", async () => {
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
    const { program: programCsharp } = await SimpleTester.compile(spec);
    const contextCsharp = await createSdkContextForTester(programCsharp, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const csharpSdkPackage = contextCsharp.sdkPackage;
    const csharpSdkClient = csharpSdkPackage.clients.find((x) =>
      x.methods.find((m) => m.name === "func"),
    );
    const csharpSdkModel = csharpSdkPackage.models.find((x) => x.name === "Test");
    ok(csharpSdkClient);
    ok(csharpSdkModel);

    const { program: programJava } = await SimpleTester.compile(spec);
    const contextJava = await createSdkContextForTester(programJava, {
      emitterName: "@azure-tools/typespec-java",
    });
    const javaSdkPackage = contextJava.sdkPackage;
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
    const { program } = await SimpleTesterWithService.compile(`
      model TestModel {
        @scope("csharp")
        csharpProp: string;
        commonProp: string;
      }
      op func(
        @body body: TestModel
      ): void;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
    const model = sdkPackage.models.find((x) => x.name === "TestModel");
    ok(model);
    const csharpProp = model.properties.find((x) => x.name === "csharpProp");
    const commonProp = model.properties.find((x) => x.name === "commonProp");
    ok(csharpProp);
    ok(commonProp);
  });

  it("exclude property from non-matching scope", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model TestModel {
        @scope("csharp")
        csharpProp: string;
        commonProp: string;
      }
      op func(
        @body body: TestModel
      ): void;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const sdkPackage = context.sdkPackage;
    const model = sdkPackage.models.find((x) => x.name === "TestModel");
    ok(model);
    const csharpProp = model.properties.find((x) => x.name === "csharpProp");
    const commonProp = model.properties.find((x) => x.name === "commonProp");
    strictEqual(csharpProp, undefined);
    ok(commonProp);
  });

  it("exclude property with negation scope", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model TestModel {
        @scope("!csharp")
        internalProp: string;
        commonProp: string;
      }
      op func(
        @body body: TestModel
      ): void;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
    const model = sdkPackage.models.find((x) => x.name === "TestModel");
    ok(model);
    const internalProp = model.properties.find((x) => x.name === "internalProp");
    const commonProp = model.properties.find((x) => x.name === "commonProp");
    strictEqual(internalProp, undefined);
    ok(commonProp);
  });

  it("include all properties without scope decorator", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      model TestModel {
        prop1: string;
        prop2: int32;
      }
      op func(
        @body body: TestModel
      ): void;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
    const model = sdkPackage.models.find((x) => x.name === "TestModel");
    ok(model);
    strictEqual(model.properties.length, 2);
  });

  it("multiple properties with different scopes", async () => {
    const { program } = await SimpleTesterWithService.compile(`
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
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const sdkPackage = context.sdkPackage;
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

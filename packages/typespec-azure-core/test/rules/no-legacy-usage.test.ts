import { Tester } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester, mockFile } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noLegacyUsage } from "../../src/rules/no-legacy-usage.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.files({
    "node_modules/mylib/package.json": JSON.stringify({
      exports: {
        ".": { typespec: "./dec.tsp" },
      },
    }),
    "node_modules/mylib/dec.tsp": `
      import "./dec.js";

      namespace MyLibrary.Legacy;

      model DummyModel {}
      extern dec someDecorator(target: unknown);
    `,
    "node_modules/mylib/dec.js": mockFile.js({
      $decorators: {
        "MyLibrary.Legacy": { someDecorator: () => {} },
      },
    }),
  })
    .import("mylib")
    .createInstance();
  tester = createLinterRuleTester(runner, noLegacyUsage, "@azure-tools/typespec-azure-core");
});

it("emits a warning diagnostic if using type from Azure.Core.Legacy", async () => {
  await tester
    .expect(
      `        
        model Input {
          input: string;
        }
        model Foo {
          bar: Azure.Core.Legacy.parameterizedNextLink<[Input.input]>
        }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/no-legacy-usage",
      message: 'Referencing elements inside Legacy namespace "Azure.Core.Legacy" is not allowed.',
    });
});

it("flags using decorator in legacy namespace", async () => {
  await tester
    .expect(
      `        
        @MyLibrary.Legacy.someDecorator
        model Test {}
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/no-legacy-usage",
      message: 'Referencing elements inside Legacy namespace "MyLibrary.Legacy" is not allowed.',
    });
});

it("flags using augment decorator in legacy namespace", async () => {
  await tester
    .expect(
      `        
        model Test {
          test: string;
        }
        /*errorPos*/@@MyLibrary.Legacy.someDecorator(Test);
      `,
    )
    .toEmitDiagnostics((x) => ({
      code: "@azure-tools/typespec-azure-core/no-legacy-usage",
      message: 'Referencing elements inside Legacy namespace "MyLibrary.Legacy" is not allowed.',
      pos: x.pos.errorPos.pos,
    }));
});

it("flags referencing legacy item in properties", async () => {
  await tester
    .expect(
      `        
        model Test {
          /*errorPos*/test: MyLibrary.Legacy.DummyModel;
        }
      `,
    )
    .toEmitDiagnostics((x) => ({
      code: "@azure-tools/typespec-azure-core/no-legacy-usage",
      message: 'Referencing elements inside Legacy namespace "MyLibrary.Legacy" is not allowed.',
      pos: x.pos.errorPos.pos,
    }));
});

it("flags referencing legacy item in model is", async () => {
  await tester
    .expect(
      `        
        model Test is /*errorPos*/MyLibrary.Legacy.DummyModel;
      `,
    )
    .toEmitDiagnostics((x) => ({
      code: "@azure-tools/typespec-azure-core/no-legacy-usage",
      message: 'Referencing elements inside Legacy namespace "MyLibrary.Legacy" is not allowed.',
      pos: x.pos.errorPos.pos,
    }));
});

it("flags referencing legacy item in model extends", async () => {
  await tester
    .expect(
      `        
        /*errorPos*/model Test extends MyLibrary.Legacy.DummyModel {}
      `,
    )
    .toEmitDiagnostics((x) => ({
      code: "@azure-tools/typespec-azure-core/no-legacy-usage",
      message: 'Referencing elements inside Legacy namespace "MyLibrary.Legacy" is not allowed.',
      pos: x.pos.errorPos.pos,
    }));
});

it("flags referencing legacy item in model spread", async () => {
  await tester
    .expect(
      `        
        model Test { .../*errorPos*/MyLibrary.Legacy.DummyModel }
      `,
    )
    .toEmitDiagnostics((x) => ({
      code: "@azure-tools/typespec-azure-core/no-legacy-usage",
      message: 'Referencing elements inside Legacy namespace "MyLibrary.Legacy" is not allowed.',
      pos: x.pos.errorPos.pos,
    }));
});

it("flags referencing legacy item in union variant", async () => {
  await tester
    .expect(
      `        
        union Test {
          /*errorPos*/test: MyLibrary.Legacy.DummyModel;
        }
      `,
    )
    .toEmitDiagnostics((x) => ({
      code: "@azure-tools/typespec-azure-core/no-legacy-usage",
      message: 'Referencing elements inside Legacy namespace "MyLibrary.Legacy" is not allowed.',
      pos: x.pos.errorPos.pos,
    }));
});

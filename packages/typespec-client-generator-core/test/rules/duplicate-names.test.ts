import {
  createLinterRuleTester,
  LinterRuleTester,
  TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { duplicateNamesRule } from "../../src/rules/duplicate-names.rule.js";
import { ArmTester, SimpleTester } from "../tester.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(
    runner,
    duplicateNamesRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

describe("duplicate model names across namespaces", () => {
  it("should emit warning for same model name in different sub-namespaces", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          namespace SubA {
            model Foo { a: string; }
          }
          namespace SubB {
            model Foo { b: string; }
          }

          @route("/a")
          op getA(): SubA.Foo;

          @route("/b")
          op getB(): SubB.Foo;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-names",
          severity: "warning",
          message: `Client name "Foo" in namespace "TestService.SubB" conflicts with same name in namespace "TestService.SubA"`,
        },
      ]);
  });

  it("should not emit warning when @clientName is used to differentiate", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          namespace SubA {
            model Foo { a: string; }
          }
          namespace SubB {
            @clientName("Bar")
            model Foo { b: string; }
          }

          @route("/a")
          op getA(): SubA.Foo;

          @route("/b")
          op getB(): SubB.Foo;
        }
        `,
      )
      .toBeValid();
  });

  it("should not emit warning for unused models with same name", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          namespace SubA {
            model Foo { a: string; }
          }
          namespace SubB {
            model Foo { b: string; }
          }

          // Only SubA.Foo is used
          @route("/a")
          op getA(): SubA.Foo;
        }
        `,
      )
      .toBeValid();
  });
});

describe("duplicate enum names across namespaces", () => {
  it("should emit warning for same enum name in different sub-namespaces", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          namespace SubA {
            enum Status { Active, Inactive }
          }
          namespace SubB {
            enum Status { Pending, Complete }
          }

          @route("/a")
          op getA(@query status: SubA.Status): void;

          @route("/b")
          op getB(@query status: SubB.Status): void;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-names",
          severity: "warning",
          message: `Client name "Status" in namespace "TestService.SubB" conflicts with same name in namespace "TestService.SubA"`,
        },
      ]);
  });
});

describe("cross-kind duplicate names across namespaces", () => {
  it("should emit warning for model and enum with same name in different namespaces", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          namespace SubA {
            model Foo { a: string; }
          }
          namespace SubB {
            enum Foo { A, B }
          }

          @route("/model")
          op getModel(): SubA.Foo;

          @route("/enum")
          op getEnum(@query foo: SubB.Foo): void;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-names",
          severity: "warning",
          message: `Client name "Foo" in namespace "TestService.SubB" conflicts with same name in namespace "TestService.SubA"`,
        },
      ]);
  });

  it("should emit warning for model and union-as-enum with same name in different namespaces", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          namespace SubA {
            model Foo { a: string; }
          }
          namespace SubB {
            /** An extensible string enum */
            union Foo {
              string,
              "Active": "Active",
              "Inactive": "Inactive",
            }
          }

          @route("/model")
          op getModel(): SubA.Foo;

          @route("/union")
          op getUnion(@query status: SubB.Foo): void;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-names",
          severity: "warning",
          message: `Client name "Foo" in namespace "TestService.SubB" conflicts with same name in namespace "TestService.SubA"`,
        },
      ]);
  });

  it("should emit warning for enum and union-as-enum with same name in different namespaces", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          namespace SubA {
            enum Foo { A, B }
          }
          namespace SubB {
            /** An extensible string enum */
            union Foo {
              string,
              "X": "X",
              "Y": "Y",
            }
          }

          @route("/enum")
          op getEnum(@query foo: SubA.Foo): void;

          @route("/union")
          op getUnion(@query status: SubB.Foo): void;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-names",
          severity: "warning",
          message: `Client name "Foo" in namespace "TestService.SubB" conflicts with same name in namespace "TestService.SubA"`,
        },
      ]);
  });
});

describe("duplicate union-as-enum names across namespaces", () => {
  it("should emit warning for same union-as-enum name in different sub-namespaces", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          namespace SubA {
            /** Status in SubA */
            union Response {
              string,
              "Success": "Success",
              "Error": "Error",
            }
          }
          namespace SubB {
            /** Status in SubB */
            union Response {
              string,
              "Ok": "Ok",
              "Fail": "Fail",
            }
          }

          @route("/a")
          op getA(@query status: SubA.Response): void;

          @route("/b")
          op getB(@query status: SubB.Response): void;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-names",
          severity: "warning",
          message: `Client name "Response" in namespace "TestService.SubB" conflicts with same name in namespace "TestService.SubA"`,
        },
      ]);
  });
});

describe("multiple duplicates (3+ types with same name)", () => {
  it("should emit warnings for all duplicates when 3+ types have the same name", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          namespace SubA {
            model Item { a: string; }
          }
          namespace SubB {
            model Item { b: string; }
          }
          namespace SubC {
            model Item { c: string; }
          }

          @route("/a")
          op getA(): SubA.Item;

          @route("/b")
          op getB(): SubB.Item;

          @route("/c")
          op getC(): SubC.Item;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-names",
          severity: "warning",
          message: `Client name "Item" in namespace "TestService.SubB" conflicts with same name in namespace "TestService.SubA"`,
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-names",
          severity: "warning",
          message: `Client name "Item" in namespace "TestService.SubC" conflicts with same name in namespace "TestService.SubA"`,
        },
      ]);
  });

  it("should emit warnings for model and enum with the same name (3 namespaces)", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          namespace SubA {
            model Data { a: string; }
          }
          namespace SubB {
            enum Data { X, Y }
          }
          namespace SubC {
            model Data { c: boolean; }
          }

          @route("/modelA")
          op getModelA(): SubA.Data;

          @route("/enum")
          op getEnum(@query data: SubB.Data): void;

          @route("/modelC")
          op getModelC(): SubC.Data;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-names",
          severity: "warning",
          message: `Client name "Data" in namespace "TestService.SubB" conflicts with same name in namespace "TestService.SubA"`,
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-names",
          severity: "warning",
          message: `Client name "Data" in namespace "TestService.SubC" conflicts with same name in namespace "TestService.SubA"`,
        },
      ]);
  });
});

describe("nested namespace scenarios", () => {
  it("should emit warning for duplicates in deeply nested namespaces", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          namespace Level1 {
            namespace Level2A {
              model DeepModel { a: string; }
            }
            namespace Level2B {
              model DeepModel { b: string; }
            }
          }

          @route("/a")
          op getA(): Level1.Level2A.DeepModel;

          @route("/b")
          op getB(): Level1.Level2B.DeepModel;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-names",
          severity: "warning",
          message: `Client name "DeepModel" in namespace "TestService.Level1.Level2B" conflicts with same name in namespace "TestService.Level1.Level2A"`,
        },
      ]);
  });

  it("should emit warning for duplicates across different nesting levels", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          model TopLevel { a: string; }

          namespace Nested {
            model TopLevel { b: string; }
          }

          @route("/top")
          op getTop(): TopLevel;

          @route("/nested")
          op getNested(): Nested.TopLevel;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-names",
          severity: "warning",
          message: `Client name "TopLevel" in namespace "TestService.Nested" conflicts with same name in namespace "TestService"`,
        },
      ]);
  });
});

describe("ARM common types conflicts", () => {
  it("should emit warning for local model with same name as ARM common type", async () => {
    const armRunner = await ArmTester.createInstance();
    const armTester = createLinterRuleTester(
      armRunner,
      duplicateNamesRule,
      "@azure-tools/typespec-client-generator-core",
    );

    await armTester
      .expect(
        `
        @armProviderNamespace
        @service
        @versioned(Versions)
        namespace TestClient;

        enum Versions {
          @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
          v1: "v1",
        }

        // Local model with same name as ARM common type
        model KeyEncryptionKeyIdentity {
          localType?: string;
        }

        model MyEncryption {
          customerManagedKeyEncryption?: Azure.ResourceManager.CommonTypes.CustomerManagedKeyEncryption;
          localKeyIdentity?: KeyEncryptionKeyIdentity;
        }

        @route("/test")
        op test(@body body: MyEncryption): void;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-names",
          severity: "warning",
          message:
            /Client name "KeyEncryptionKeyIdentity" in namespace .* conflicts with same name in namespace/,
        },
      ]);
  });

  it("should not emit warning when @clientName is used to differentiate from ARM common type", async () => {
    const armRunner = await ArmTester.createInstance();
    const armTester = createLinterRuleTester(
      armRunner,
      duplicateNamesRule,
      "@azure-tools/typespec-client-generator-core",
    );

    await armTester
      .expect(
        `
        @armProviderNamespace
        @service
        @versioned(Versions)
        namespace TestClient;

        enum Versions {
          @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
          v1: "v1",
        }

        // Local model with same name as ARM common type, but renamed
        @clientName("LocalKeyEncryptionKeyIdentity")
        model KeyEncryptionKeyIdentity {
          localType?: string;
        }

        model MyEncryption {
          customerManagedKeyEncryption?: Azure.ResourceManager.CommonTypes.CustomerManagedKeyEncryption;
          localKeyIdentity?: KeyEncryptionKeyIdentity;
        }

        @route("/test")
        op test(@body body: MyEncryption): void;
        `,
      )
      .toBeValid();
  });
});

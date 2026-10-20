import { Tester } from "#test/test-host.js";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noEnumRule } from "../../src/rules/no-enum.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(runner, noEnumRule, "@azure-tools/typespec-azure-core");
});

it("emits a warning diagnostic if enum is used", async () => {
  await tester
    .expect(
      `        
        enum PetKind {
          cat, dog
        }
        `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-enum",
      },
    ]);
});

it("allows the version enum", async () => {
  await tester
    .expect(
      `       
        @service
        @versioned(Versions)
        namespace Foo; 
        enum Versions {
          v1, v2
        }
        `,
    )
    .toBeValid();
});

it("allows known authentication resource catalogs", async () => {
  await tester
    .expect(
      `
      enum Audience {
        Public: "https://search.azure.com",
        Government: "https://search.azure.us",
      }
      @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
      model Auth is AadOauth2Auth<["https://search.azure.com/.default"]>;
    `,
    )
    .toBeValid();
});

it("still warns for ordinary enums alongside an authentication catalog", async () => {
  await tester
    .expect(
      `
      enum Audience { Public: "https://search.azure.com" }
      @azureTokenAuthentication(#{kind: AzureTokenAuthenticationKind.entraDefaultScope, defaultAudience: Audience.Public})
      model Auth is AadOauth2Auth<["https://search.azure.com/.default"]>;
      enum PetKind { cat, dog }
    `,
    )
    .toEmitDiagnostics([{ code: "@azure-tools/typespec-azure-core/no-enum" }]);
});

it("emit warning about other enums in versioned service", async () => {
  await tester
    .expect(
      `       
        @service
        @versioned(Versions)
        namespace Foo; 
        enum Versions {
          v1, v2
        }

        enum Bar { a,  b}
        `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-enum",
      },
    ]);
});

describe("codefix", () => {
  it("codefix simple enum", async () => {
    await tester
      .expect(
        `        
          enum PetKind {
            cat, dog
          }
          `,
      )
      .applyCodeFix("enum-to-extensible-union").toEqual(`
          union PetKind {
            string,

            cat: "cat", dog: "dog",
          }
        `);
  });

  it("keeps new lines", async () => {
    await tester
      .expect(
        `        
          enum PetKind {
            cat,
            dog
          }
          `,
      )
      .applyCodeFix("enum-to-extensible-union").toEqual(`
          union PetKind {
            string,

            cat: "cat",
            dog: "dog",
          }
        `);
  });

  it("codefix enum with named member", async () => {
    await tester
      .expect(
        `        
          enum PetKind {
            Cat: "cat", Dog: "dog",
          }
          `,
      )
      .applyCodeFix("enum-to-extensible-union").toEqual(`
          union PetKind {
            string,

            Cat: "cat", Dog: "dog",
          }
        `);
  });

  it("keeps decorators, comments, directives and doc comment between members", async () => {
    await tester
      .expect(
        `        
          enum PetKind {
            // cat

            
            #suppress "cat"
            cat, 
            
            // dog

            
            #suppress "dog"
            dog

            // end
          }
          `,
      )
      .applyCodeFix("enum-to-extensible-union").toEqual(`
          union PetKind {
            string,

            // cat

            
            #suppress "cat"
            cat: "cat", 
            
            // dog

            
            #suppress "dog"
            dog: "dog",

            // end
          }
        `);
  });
});

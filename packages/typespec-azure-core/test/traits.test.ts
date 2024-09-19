import { Model, ModelProperty } from "@typespec/compiler";
import {
  BasicTestRunner,
  expectDiagnosticEmpty,
  expectDiagnostics,
} from "@typespec/compiler/testing";
import { deepStrictEqual, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { getSourceTraitName } from "../src/traits.js";
import { createAzureCoreTestRunner, getServiceForVersion } from "./test-host.js";

describe("typespec-azure-core: service traits", () => {
  const traitServiceCode = `
    @versioned(Versions)
    @service({ title: "TraitTest" })
    namespace Microsoft.Test;

    enum Versions {
      @useDependency(Azure.Core.Versions.v1_0_Preview_1)
      v1,
      @useDependency(Azure.Core.Versions.v1_0_Preview_1)
      v2
    }

    enum TraitLocation { Foo, Bar }
    enum TraitContext { Baz, Bork }

    @Traits.trait
    model ContextTrait {
      @Traits.traitContext(TraitContext.Baz | TraitContext.Bork)
      contextTrait: {
        @Traits.traitLocation(TraitLocation.Foo)
        foo: {
          contextFoo: string;
        };

        @Traits.traitLocation(TraitLocation.Bar)
        bar: {
          contextBar: string;
        }
      };
    }

    @Traits.trait
    model NoContextTrait {
      noContextTrait: {
        @Traits.traitLocation(TraitLocation.Foo)
        foo: {
          noContextFoo: string;
        };

        @Traits.traitLocation(TraitLocation.Bar)
        bar: {
          noContextBar: string;
        }
      };
    }

    model WithTraits<Traits extends TypeSpec.Reflection.Model, Contexts = unknown> {
      ...Azure.Core.Traits.Private.TraitProperties<Traits, TraitLocation.Foo, Contexts>;
      ...Azure.Core.Traits.Private.TraitProperties<Traits, TraitLocation.Bar, Contexts>;
    }
`;

  let runner: BasicTestRunner;
  beforeEach(async () => {
    runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
  });

  describe("@trait", () => {
    it("emits diagnostic when trait type does not have exactly one property", async () => {
      const diagnostics = await runner.diagnose(`
        @Traits.trait
        model None {
          one: {};
          two: {};
        }

        @Traits.trait
        model Correct {
          one: {};
        }

        @Traits.trait
        model MoreThanOne {
          one: {};
          two: {};
        }
        `);

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-azure-core/invalid-trait-property-count",
          message:
            "Trait type 'None' is not a valid trait type.  It must contain exactly one property that maps to a model type.",
        },
        {
          code: "@azure-tools/typespec-azure-core/invalid-trait-property-count",
          message:
            "Trait type 'MoreThanOne' is not a valid trait type.  It must contain exactly one property that maps to a model type.",
        },
      ]);
    });

    it("emits diagnostic when trait envelope property is not a model type", async () => {
      const diagnostics = await runner.diagnose(`
        @Traits.trait
        model BadTrait {
          shouldBeModel: 42;
        }
        `);

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-azure-core/invalid-trait-property-type",
          message:
            "Trait type 'BadTrait' has an invalid envelope property type.  The property 'shouldBeModel' must be a model type.",
        },
      ]);
    });

    it("emits diagnostic when trait property does not have a location", async () => {
      const diagnostics = await runner.diagnose(`
        @Traits.trait
        model MissingLocation {
          missing: {
            parameters: {};

            @Traits.traitLocation(Azure.Core.Traits.TraitLocation.Response)
            response: {};
          };
        }
      `);

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-azure-core/trait-property-without-location",
          message:
            "Trait type 'MissingLocation' contains property 'parameters' which does not have a @traitLocation decorator.",
        },
      ]);
    });

    it("marks the trait envelope property with the trait name", async () => {
      const [{ unnamedTrait, namedTrait }, diagnostics] = await runner.compileAndDiagnose(`
        @Traits.trait
        model UnnamedTrait {
          @test
          unnamedTrait: {};
        }

        @Traits.trait("Named")
        model NamedTrait {
          @test
          namedTrait: {};
        }
        `);

      expectDiagnosticEmpty(diagnostics);
      strictEqual(
        getSourceTraitName(runner.program, unnamedTrait as ModelProperty),
        "UnnamedTrait",
      );
      strictEqual(getSourceTraitName(runner.program, namedTrait as ModelProperty), "Named");
    });
  });

  describe("@traitContext", () => {
    it("emits a diagnostic when given an invalid trait context", async () => {
      const diagnostics = await runner.diagnose(`
        @Traits.trait
        model BadUnionContext {
          @Traits.traitContext(Azure.Core.Traits.TraitContext.Read | "foo")
          withContext: {};
        }

        @Traits.trait
        model BadIntrinsicContext {
          @Traits.traitContext(null)
          withContext: {};
        }

        @Traits.trait
        model GoodContext {
          @Traits.traitContext(unknown)
          withContext: {};
        }
        `);

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-azure-core/invalid-trait-context",
          message:
            "The trait context can only be an enum member, union of enum members, or `unknown`.",
        },
        {
          code: "@azure-tools/typespec-azure-core/invalid-trait-context",
          message:
            "The trait context can only be an enum member, union of enum members, or `unknown`.",
        },
      ]);
    });
  });

  describe("@applyTraitProperties", () => {
    it("includes properties from all traits matching the desired location and context", async () => {
      const [{ NoContext, WithContext }, diagnostics] = await runner.compileAndDiagnose(`
        ${traitServiceCode}

        @test
        model NoContext is WithTraits<ContextTrait & NoContextTrait>;

        @test
        model WithContext is WithTraits<ContextTrait & NoContextTrait, TraitContext.Bork>;
      `);

      expectDiagnosticEmpty(diagnostics);
      deepStrictEqual(Array.from((NoContext as Model).properties.keys()), [
        "noContextFoo",
        "noContextBar",
      ]);
      deepStrictEqual(Array.from((WithContext as Model).properties.keys()), [
        "contextFoo",
        "noContextFoo",
        "contextBar",
        "noContextBar",
      ]);
    });
  });

  describe("@traitAdded", () => {
    it("enables traits to be added at a later version", async () => {
      const diagnostics = await runner.diagnose(`
        ${traitServiceCode}
        @Azure.Core.Traits.traitAdded(Versions.v2)
        model AddedTrait is NoContextTrait;
        model WithContext is WithTraits<ContextTrait & AddedTrait, TraitContext.Bork>;
      `);

      expectDiagnosticEmpty(diagnostics);

      const v1 = getServiceForVersion(runner.program, "v1");
      const v1Model = v1.models.get("WithContext");
      deepStrictEqual(Array.from(v1Model!.properties.keys()), ["contextFoo", "contextBar"]);

      const v2 = getServiceForVersion(runner.program, "v2");
      const v2Model = v2.models.get("WithContext");
      deepStrictEqual(Array.from(v2Model!.properties.keys()), [
        "contextFoo",
        "noContextFoo",
        "contextBar",
        "noContextBar",
      ]);
    });
  });

  describe("@ensureTraitsPresent", () => {
    it("emits a diagnostic when expected traits are missing from an interface", async () => {
      const diagnostics = await runner.diagnose(`
        ${traitServiceCode}

        @Azure.Core.Traits.Private.ensureTraitsPresent(Traits, [
          { trait: "ContextTrait", diagnostic: "client-request-id-trait-missing" },
          { trait: "MissingTrait", diagnostic: "conditional-requests-trait-missing" },
          { trait: "AnotherMissingTrait", diagnostic: "repeatable-requests-trait-missing" }
        ])
        interface Operations<Traits extends Reflection.Model> {}

        interface Usage extends Operations<ContextTrait & NoContextTrait> {}
        `);

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-azure-core/conditional-requests-trait-missing",
        },
        {
          code: "@azure-tools/typespec-azure-core/repeatable-requests-trait-missing",
        },
      ]);
    });
  });

  describe("@ensureAllQueryParams", () => {
    it("emits a diagnostic when a property isn't marked with @query", async () => {
      const diagnostics = await runner.diagnose(`
        using Azure.Core.Traits;
        alias Test = QueryParametersTrait<{
          @query isQuery: string;
          isNotMarked: string;
          @header isHeader: string;
        }>;
        `);

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-azure-core/invalid-parameter",
          message: "Expected property 'isNotMarked' to be a query parameter.",
        },
        {
          code: "@azure-tools/typespec-azure-core/invalid-parameter",
          message: "Expected property 'isHeader' to be a query parameter.",
        },
      ]);
    });

    it("emits a diagnostic when using non model", async () => {
      const diagnostics = await runner.diagnose(`
        alias Test = Azure.Core.Traits.QueryParametersTrait<"abc">;
      `);

      expectDiagnostics(diagnostics, {
        code: "invalid-argument",
      });
    });
  });

  describe("@ensureAllHeaderParams", () => {
    it("emits a diagnostic when a property isn't marked with @query", async () => {
      const diagnostics = await runner.diagnose(`
        using Azure.Core.Traits;
        alias TestRequest = RequestHeadersTrait<{
          @query isQuery: string;
          isNotMarked: string;
          @header isHeader: string;
        }>;
        `);

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-azure-core/invalid-parameter",
          message: "Expected property 'isQuery' to be a header parameter.",
        },
        {
          code: "@azure-tools/typespec-azure-core/invalid-parameter",
          message: "Expected property 'isNotMarked' to be a header parameter.",
        },
      ]);
    });
    it("emits a diagnostic when using non model", async () => {
      const diagnostics = await runner.diagnose(`
        alias Test = Azure.Core.Traits.RequestHeadersTrait<"abc">;
      `);

      expectDiagnostics(diagnostics, {
        code: "invalid-argument",
      });
    });
  });
});

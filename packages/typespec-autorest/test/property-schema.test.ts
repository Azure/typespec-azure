import { deepStrictEqual, ok } from "assert";
import { describe, it } from "vitest";
import { openApiFor } from "./test-host.js";

describe("typespec-autorest: Property schema tests", () => {
  it("produces standard schema for lro status by default", async () => {
    const result = await openApiFor(
      `
      @service({title: "Test"}) 
      namespace Test;

      model Bar {propB: int32;}
      model Foo { prop1: string;}

      enum FooPrime { Succeeded, Failed, Canceled}

      @pattern("^[a-zA-Z0-9-]{3,24}$")
      scalar BarPrime extends string;

      model UsesAll {
        @visibility(Lifecycle.Read)
        fooProp: Foo;
        @visibility(Lifecycle.Read)
        primeProp: FooPrime;
        @visibility(Lifecycle.Read)
        barPrimeProp: BarPrime;
      }

      op myOp(): void;


      `,
    );

    ok(!result.isRef);
    deepStrictEqual(result.definitions.FooPrime.readOnly, undefined);
  });

  it("produces normal status schema when use-read-only-status-schema is false", async () => {
    const result = await openApiFor(
      `
      @service({title: "Test"}) 
      namespace Test;

      model Bar {propB: int32;}
      model Foo { prop1: string;}

      enum FooPrime { Succeeded, Failed, Canceled}

      @pattern("^[a-zA-Z0-9-]{3,24}$")
      scalar BarPrime extends string;

      model UsesAll {
        @visibility(Lifecycle.Read)
        fooProp: Foo;
        @visibility(Lifecycle.Read)
        primeProp: FooPrime;
        @visibility(Lifecycle.Read)
        barPrimeProp: BarPrime;
      }

      op myOp(first: Foo, second: FooPrime, third: BarPrime): void;


      `,
      undefined,
      { "use-read-only-status-schema": false },
    );

    ok(!result.isRef);
    deepStrictEqual(result.definitions.FooPrime.readOnly, undefined);
  });

  it("creates readOnly schema for status properties when set to 'use-read-only-status-schema': true", async () => {
    const result = await openApiFor(
      `
      @service({title: "Test"}) 
      namespace Test;

      model Bar {propB: int32;}
      model Foo { prop1: string;}

      enum FooPrime { Succeeded, Failed, Canceled}

      @pattern("^[a-zA-Z0-9-]{3,24}$")
      scalar BarPrime extends string;

      model UsesAll {
        @visibility(Lifecycle.Read)
        fooProp: Foo;
        @visibility(Lifecycle.Read)
        primeProp: FooPrime;
        @visibility(Lifecycle.Read)
        barPrimeProp: BarPrime;
        otherProp: FooPrime;
      }

      op myOp(): void;


      `,
      undefined,
      { "use-read-only-status-schema": true },
    );

    ok(!result.isRef);
    deepStrictEqual(result.definitions.FooPrime.readOnly, true);
  });

  it("creates readOnly schema for status properties when set to 'use-read-only-status-schema': true for unions", async () => {
    const result = await openApiFor(
      `
      @service({title: "Test"}) 
      namespace Test;

      model Bar {propB: int32;}
      model Foo { prop1: string;}

      union FooPrime { "Succeeded", "Failed", "Canceled"}

      @pattern("^[a-zA-Z0-9-]{3,24}$")
      scalar BarPrime extends string;

      model UsesAll {
        @visibility(Lifecycle.Read)
        fooProp: Foo;
        @visibility(Lifecycle.Read)
        primeProp: FooPrime;
        @visibility(Lifecycle.Read)
        barPrimeProp: BarPrime;
        otherProp: FooPrime;
      }

      op myOp(): void;


      `,
      undefined,
      { "use-read-only-status-schema": true },
    );

    ok(!result.isRef);
    deepStrictEqual(result.definitions.FooPrime.readOnly, true);
  });
});

import { deepStrictEqual, ok } from "assert";
import { it } from "vitest";
import { openApiFor } from "./test-host.js";

it("produces standard schema for lro status by default", async () => {
  const result = await openApiFor(
    `
    @service({title: "Test"}) 
    namespace Test;

    model Bar {propB: int32;}
    model Foo { prop1: string;}

    enum FooPrime { Succeeded, Failed, Canceled}

    @pattern("[a-Z0-9]+")
    scalar BarPrime extends string;

    model UsesAll {
      @visibility("read")
      fooProp: Foo;
      @visibility("read")
      primeProp: FooPrime;
      @visibility("read")
      barPrimeProp: BarPrime;
    }

    op myOp(): void;


    `
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

    @pattern("[a-Z0-9]+")
    scalar BarPrime extends string;

    model UsesAll {
      @visibility("read")
      fooProp: Foo;
      @visibility("read")
      primeProp: FooPrime;
      @visibility("read")
      barPrimeProp: BarPrime;
    }

    op myOp(first: Foo, second: FooPrime, third: BarPrime): void;


    `,
    { "use-read-only-status-schema": false }
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

    @pattern("[a-Z0-9]+")
    scalar BarPrime extends string;

    model UsesAll {
      @visibility("read")
      fooProp: Foo;
      @visibility("read")
      primeProp: FooPrime;
      @visibility("read")
      barPrimeProp: BarPrime;
      otherProp: FooPrime;
    }

    op myOp(): void;


    `,
    { "use-read-only-status-schema": true }
  );

  ok(!result.isRef);
  deepStrictEqual(result.definitions.FooPrime.readOnly, true);
});

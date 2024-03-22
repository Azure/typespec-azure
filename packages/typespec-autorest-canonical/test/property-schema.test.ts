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

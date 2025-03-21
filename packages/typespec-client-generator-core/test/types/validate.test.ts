import { expectDiagnostics } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("duplicate discriminated unions", async () => {
  const diagnostics = await runner.diagnose(
    `
      @service
      namespace Contoso.WidgetManager;
      
      model Cat {
        name: string;
        meow: int32;
      }

      model Dog {
        name: string;
        bark: string;
      }

      @discriminated
      union Pet {
        cat: Cat,
        dog: Dog,
      }

      @discriminated(#{ discriminatorPropertyName: "dataKind", envelopePropertyName: "data" })
      union AnotherPet {
        cat: Cat,
        dog: Dog,
      }
    `,
  );

  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/no-discriminated-unions",
    },
    {
      code: "@azure-tools/typespec-client-generator-core/no-discriminated-unions",
    },
  ]);
});

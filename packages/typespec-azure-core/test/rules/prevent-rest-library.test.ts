import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { preventRestLibraryInterfaces } from "../../src/rules/prevent-rest-library.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: no-rest-library-interfaces rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(
      runner,
      preventRestLibraryInterfaces,
      "@azure-tools/typespec-azure-core"
    );
  });

  it("emits an error diagnostic for interfaces that extend one from TypeSpec.Rest.Resource", async () => {
    await tester
      .expect(
        `
      @resource("widgets")
      model Widget { @key name: string; }

      interface MyResourceOperations<TResource extends TypeSpec.Reflection.Model> {
        read is ResourceRead<TResource>;
      }

      @TypeSpec.Http.route("bad")
      interface Widgets extends TypeSpec.Rest.Resource.ResourceOperations<Widget, Foundations.ErrorResponse> {};

      @TypeSpec.Http.route("good")
      interface WidgetsAlt extends MyResourceOperations<Widget> {};
`
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-rest-library-interfaces",
          message:
            "Resource interfaces from the TypeSpec.Rest.Resource library are incompatible with Azure.Core.",
        },
      ]);
  });
});

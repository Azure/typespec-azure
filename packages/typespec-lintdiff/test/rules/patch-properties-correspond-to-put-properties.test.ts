import { resolvePath } from "@typespec/compiler";
import {
  createLinterRuleTester,
  createTester,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { patchPropertiesCorrespondToPutPropertiesRule } from "../../src/rules/patch-properties-correspond-to-put-properties.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
}).importLibraries();

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    patchPropertiesCorrespondToPutPropertiesRule,
    "tsp-lintdiff-local-linter",
  );
});

describe("patch-properties-correspond-to-put-properties", () => {
  it("compares emitted operation bodies instead of same-endpoint overload bodies", async () => {
    await tester
      .expect(
        `
        using TypeSpec.Http;

        @Azure.ResourceManager.armProviderNamespace
        @service
        namespace Microsoft.TestService;

        model PutBody {
          emittedProperty?: string;
        }

        model PatchBody {
          emittedProperty?: string;
        }

        model PutOverloadBody {
          putOverloadOnly?: string;
        }

        model PatchOverloadBody {
          patchOverloadOnly?: string;
        }

        interface Widgets {
          @route("/widgets/{name}")
          @put
          createOrUpdate(@path name: string, @body body: PutBody): void;

          @route("/widgets/{name}")
          @put
          @overload(Widgets.createOrUpdate)
          createOrUpdateOverload(@path name: string, @body body: PutOverloadBody): void;

          @route("/widgets/{name}")
          @patch
          update(@path name: string, @body body: PatchBody): void;

          @route("/widgets/{name}")
          @patch
          @overload(Widgets.update)
          updateOverload(@path name: string, @body body: PatchOverloadBody): void;
        }
      `,
      )
      .toBeValid();
  });
});

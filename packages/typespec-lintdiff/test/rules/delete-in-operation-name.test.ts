import { getSourceLocation, resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { describe, it } from "vitest";
import { deleteInOperationNameRule } from "../../src/rules/delete-in-operation-name.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: ["@typespec/http"],
}).importLibraries();

const ArmTester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/openapi",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
}).importLibraries();

async function tester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    deleteInOperationNameRule,
    "tsp-lintdiff-local-linter",
  );
}

function diagnostic(name: string) {
  return {
    code: "tsp-lintdiff-local-linter/delete-in-operation-name",
    message: `DELETE operation '${name}' should start with 'delete'.`,
  };
}

describe("delete-in-operation-name", () => {
  it.each(["remove", "purge", "widgetDelete", "delete_remove"])(
    "checks the authored prefix %s",
    async (name) => {
      const expectation = (await tester()).expect(`
        using TypeSpec.Http;
        @service namespace Test;
        @delete @route("/item") op ${name}(): void;
      `);
      if (name.toLowerCase().startsWith("delete")) {
        await expectation.toBeValid();
      } else {
        await expectation.toEmitDiagnostics([diagnostic(name)]);
      }
    },
  );

  it.each(["delete", "deleteWidget", "DeleteWidget", "DELETEWidget"])(
    "accepts the case-insensitive delete prefix %s",
    async (name) => {
      await (
        await tester()
      )
        .expect(
          `
          using TypeSpec.Http;
          @service namespace Test;
          @delete @route("/item") op ${name}(): void;
        `,
        )
        .toBeValid();
    },
  );

  it.each(["get", "post", "put", "patch"])("ignores the %s verb", async (verb) => {
    await (
      await tester()
    )
      .expect(
        `
        using TypeSpec.Http;
        @service namespace Test;
        @${verb} @route("/item") op remove(): void;
      `,
      )
      .toBeValid();
  });

  it("does not let the interface prefix mask the operation name", async () => {
    await (
      await tester()
    )
      .expect(
        `
        using TypeSpec.Http;
        @service namespace Test;
        @route("/item") interface DeleteWidgets { @delete /*remove*/remove(): void; }
      `,
      )
      .toEmitDiagnostics(({ remove }) => {
        const location = getSourceLocation(remove);
        return [{ ...diagnostic("remove"), file: location.file.path, pos: location.pos }];
      });
  });

  it("checks service endpoints without diagnosing client-only customization operations", async () => {
    await (
      await tester()
    )
      .expect(
        `
        using TypeSpec.Http;
        @service namespace Test {
          @delete @route("/item") op remove(): void;
        }
        namespace Customizations {
          @delete @route("/customization") op removeForClient(): void;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic("remove")]);
  });

  it.each(["remove", "deleteWidget"])("validates the documented HTTP name %s", async (name) => {
    const expectation = (await tester()).expect(`
      using TypeSpec.Http;
      @service namespace Test;
      @delete @route("/widgets/{id}")
      op ${name}(@path id: string): void;
    `);
    if (name === "remove") {
      await expectation.toEmitDiagnostics([diagnostic(name)]);
    } else {
      await expectation.toBeValid();
    }
  });

  it.each(["remove", "delete"])("checks a supported ARM template name %s", async (name) => {
    const ruleTester = createLinterRuleTester(
      await ArmTester.createInstance(),
      deleteInOperationNameRule,
      "tsp-lintdiff-local-linter",
    );
    const expectation = ruleTester.expect(`
      using TypeSpec.Http;
      using TypeSpec.Rest;
      using Azure.ResourceManager;
      @service @armProviderNamespace
      @armCommonTypesVersion(CommonTypes.Versions.v5)
      namespace Arm;
      model Widget is ProxyResource<WidgetProperties> {
        @key("widgetName") @segment("widgets") name: string;
      }
      model WidgetProperties {}
      @armResourceOperations interface Widgets {
        ${name} is ArmResourceDeleteSync<Widget>;
      }
    `);
    if (name === "remove") {
      await expectation.toEmitDiagnostics([diagnostic(name)]);
    } else {
      await expectation.toBeValid();
    }
  });
});

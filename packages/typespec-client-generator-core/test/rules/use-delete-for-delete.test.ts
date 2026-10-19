import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";

import { beforeEach, describe, it } from "vitest";
import { useDeleteForDeleteRule } from "../../src/rules/use-delete-for-delete.js";
import { ArmBaseTester, ArmTester, SimpleTester } from "../tester.js";

function diagnostic(operationName: string, target = operationName) {
  return {
    code: "@azure-tools/typespec-client-generator-core/use-delete-for-delete",
    severity: "warning" as const,
    message: `DELETE SDK method name '${operationName}' should start with 'delete'.`,
    target,
  };
}

describe("HTTP SDK names", () => {
  let tester: LinterRuleTester;
  const header = "@service namespace Test;";

  beforeEach(async () => {
    const runner = await SimpleTester.import("@typespec/openapi").createInstance();
    tester = createLinterRuleTester(
      runner,
      useDeleteForDeleteRule,
      "@azure-tools/typespec-client-generator-core",
    );
  });

  it("reports an invalid HTTP SDK name", async () => {
    await tester
      .expect(
        `${header}
        @delete
        @route("/widgets/{id}")
        op remove(@path id: string): void;
      `,
      )
      .toEmitDiagnostics([diagnostic("remove")]);
  });

  it("accepts a valid HTTP SDK name", async () => {
    await tester
      .expect(
        `${header}
        @delete
        @route("/widgets/{id}")
        op deleteWidget(@path id: string): void;
      `,
      )
      .toBeValid();
  });

  it("accepts a common SDK name override", async () => {
    await tester
      .expect(
        `${header}
        @Azure.ClientGenerator.Core.clientName("deleteWidget")
        @delete
        @route("/widgets/{id}")
        op remove(@path id: string): void;
      `,
      )
      .toBeValid();
  });

  it("reports an invalid unscoped client name on the authored operation", async () => {
    await tester
      .expect(
        `${header}
        @clientName("remove")
        @delete @route("/widgets") op deleteWidget(): void;
      `,
      )
      .toEmitDiagnostics([diagnostic("remove", "deleteWidget")]);
  });

  it("ignores a language-specific override of a compliant common name", async () => {
    await tester
      .expect(
        `${header}
        @clientName("remove", "csharp")
        @delete @route("/widgets") op deleteWidget(): void;
      `,
      )
      .toBeValid();
  });

  it("does not let a language-specific override fix an invalid common name", async () => {
    await tester
      .expect(
        `${header}
        @clientName("deleteWidget", "python")
        @delete @route("/widgets") op remove(): void;
      `,
      )
      .toEmitDiagnostics([diagnostic("remove")]);
  });

  it("uses a valid common override when common and scoped names coexist", async () => {
    await tester
      .expect(
        `${header}
        @clientName("deleteWidget")
        @clientName("remove", "csharp")
        @delete @route("/widgets") op remove(): void;
      `,
      )
      .toBeValid();
  });

  it("reports an invalid common override despite a valid scoped name", async () => {
    await tester
      .expect(
        `${header}
        @clientName("remove")
        @clientName("deleteWidget", "python")
        @delete @route("/widgets") op deleteWidget(): void;
      `,
      )
      .toEmitDiagnostics([diagnostic("remove", "deleteWidget")]);
  });

  it("honors an exact common SDK name", async () => {
    await tester
      .expect(
        `${header}
        @clientName(exact("DeleteWidget"))
        @delete @route("/widgets") op remove(): void;
      `,
      )
      .toBeValid();
  });

  it("reports an invalid exact common SDK name on the authored operation", async () => {
    await tester
      .expect(
        `${header}
        @clientName(exact("RemoveWidget"))
        @delete @route("/widgets") op deleteWidget(): void;
      `,
      )
      .toEmitDiagnostics([diagnostic("RemoveWidget", "deleteWidget")]);
  });

  it("uses the supported friendly name fallback", async () => {
    await tester
      .expect(
        `${header}
        @friendlyName("deleteWidget")
        @delete @route("/widgets") op remove(): void;
      `,
      )
      .toBeValid();
  });

  it("reports an invalid friendly name on the authored operation", async () => {
    await tester
      .expect(
        `${header}
        @friendlyName("remove")
        @delete @route("/widgets") op deleteWidget(): void;
      `,
      )
      .toEmitDiagnostics([diagnostic("remove", "deleteWidget")]);
  });

  it("prefers a common client name over the friendly name fallback", async () => {
    await tester
      .expect(
        `${header}
        @friendlyName("remove")
        @clientName("deleteWidget")
        @delete @route("/widgets") op erase(): void;
      `,
      )
      .toBeValid();
  });

  it("does not let an OpenAPI operation ID fix an invalid SDK name", async () => {
    await tester
      .expect(
        `${header}
        @TypeSpec.OpenAPI.operationId("Widgets_Delete")
        @delete @route("/widgets") op remove(): void;
      `,
      )
      .toEmitDiagnostics([diagnostic("remove")]);
  });

  it("ignores an invalid OpenAPI operation ID for a compliant SDK name", async () => {
    await tester
      .expect(
        `${header}
        @TypeSpec.OpenAPI.operationId("Widgets_Remove")
        @delete @route("/widgets") op deleteWidget(): void;
      `,
      )
      .toBeValid();
  });

  it("does not let a Delete-prefixed group mask an invalid method name", async () => {
    await tester
      .expect(
        `${header}
        interface DeleteWidgets {
          @delete @route("/widgets") remove(): void;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic("remove")]);
  });

  it("reports each offending concrete endpoint once", async () => {
    await tester
      .expect(
        `${header}
        @delete @route("/widgets") op removeWidget(): void;
        @delete @route("/gadgets") op eraseGadget(): void;
        @delete @route("/valid") op deleteItem(): void;
      `,
      )
      .toEmitDiagnostics([diagnostic("removeWidget"), diagnostic("eraseGadget")]);
  });

  it("checks service endpoints rather than client-only declarations", async () => {
    await tester
      .expect(
        `
        @service namespace Test {
          @delete @route("/widgets") op remove(): void;
        }
        namespace Customizations {
          @delete @route("/customizations") op removeForClient(): void;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic("remove")]);
  });

  it("accepts delete prefixes case-insensitively", async () => {
    await tester
      .expect(
        `${header}
        @delete @route("/one") op delete(): void;
        @delete @route("/two") op DeleteWidget(): void;
        @delete @route("/three") op DELETEAll(): void;
      `,
      )
      .toBeValid();
  });

  it("requires delete at the beginning of the SDK name", async () => {
    await tester
      .expect(`${header} @delete @route("/widgets") op softDeleteWidget(): void;`)
      .toEmitDiagnostics([diagnostic("softDeleteWidget")]);
  });

  it("does not apply to other HTTP verbs", async () => {
    await tester
      .expect(
        `${header}
        @get @route("/one") op read(): void;
        @post @route("/two") op create(): void;
        @put @route("/three") op replace(): void;
        @patch @route("/four") op update(): void;
      `,
      )
      .toBeValid();
  });
});

describe("standard ARM operations", () => {
  let tester: LinterRuleTester;
  const resource = `
    @armProviderNamespace @service
    @armCommonTypesVersion(CommonTypes.Versions.v5)
    namespace Arm;
    model Widget is ProxyResource<WidgetProperties> {
      @key("widgetName") @segment("widgets") name: string;
    }
    model WidgetProperties {}
  `;

  beforeEach(async () => {
    const runner = await ArmTester.createInstance();
    tester = createLinterRuleTester(
      runner,
      useDeleteForDeleteRule,
      "@azure-tools/typespec-client-generator-core",
    );
  });

  it("reports a customized standard ARM delete endpoint", async () => {
    await tester
      .expect(
        `${resource}
        @armResourceOperations interface Widgets {
          remove is ArmResourceDeleteSync<Widget>;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic("remove")]);
  });

  it("accepts a standard ARM delete endpoint", async () => {
    await tester
      .expect(
        `${resource}
        @armResourceOperations interface Widgets {
          delete is ArmResourceDeleteSync<Widget>;
        }
      `,
      )
      .toBeValid();
  });

  it("honors a common client name on a standard ARM delete endpoint", async () => {
    await tester
      .expect(
        `${resource}
        @armResourceOperations interface Widgets {
          @clientName("deleteWidget")
          remove is ArmResourceDeleteSync<Widget>;
        }
      `,
      )
      .toBeValid();
  });

  describe("standalone standard template fixtures", () => {
    let setup: string;
    let examples: string[];

    beforeEach(async () => {
      const runner = await ArmBaseTester.createInstance();
      tester = createLinterRuleTester(
        runner,
        useDeleteForDeleteRule,
        "@azure-tools/typespec-client-generator-core",
      );

      const snippets = [
        `import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-resource-manager";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using Azure.ResourceManager;
using Azure.ClientGenerator.Core;

@armProviderNamespace
@service
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Example;

model Widget is ProxyResource<WidgetProperties> {
  @key("widgetName") @segment("widgets") name: string;
}

model WidgetProperties {}
`,
        `@armResourceOperations
interface Widgets {
  remove is ArmResourceDeleteSync<Widget>;
}
`,
        `@armResourceOperations
interface Widgets {
  delete is ArmResourceDeleteSync<Widget>;
}
`,
        `@armResourceOperations
interface Widgets {
  @clientName("deleteWidget")
  remove is ArmResourceDeleteSync<Widget>;
}
`,
      ];

      [setup, ...examples] = snippets;
    });

    it("reports the standard incorrect template alias", async () => {
      await tester.expect(`${setup}\n${examples[0]}`).toEmitDiagnostics([diagnostic("remove")]);
    });

    it("accepts the standard correct template alias", async () => {
      await tester.expect(`${setup}\n${examples[1]}`).toBeValid();
    });

    it("accepts the standard template client name override", async () => {
      await tester.expect(`${setup}\n${examples[2]}`).toBeValid();
    });
  });
});

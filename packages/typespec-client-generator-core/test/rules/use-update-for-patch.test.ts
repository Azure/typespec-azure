import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { beforeEach, describe, it, vi } from "vitest";
import { useUpdateForPatchRule } from "../../src/rules/use-update-for-patch.js";
import { ArmTester } from "../tester.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});

let tester: LinterRuleTester;
let runner: TesterInstance;

beforeEach(async () => {
  runner = await ArmTester.import("@typespec/openapi").createInstance();
  tester = createLinterRuleTester(
    runner,
    useUpdateForPatchRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

const header = `
  @armProviderNamespace @service
  @armCommonTypesVersion(CommonTypes.Versions.v5)
  namespace Arm;
`;

const widget = `
  model Widget is TrackedResource<WidgetProperties> {
    @key("widgetName") @segment("widgets") name: string;
  }
  model WidgetProperties { provisioningState?: ResourceProvisioningState; }
`;

function diagnostic(operationName: string, target = operationName) {
  return {
    code: "@azure-tools/typespec-client-generator-core/use-update-for-patch",
    severity: "warning" as const,
    message: `PATCH SDK method name '${operationName}' should start with 'update'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
    target,
  };
}

async function documentationSnippet(section: string) {
  const source = await readFile(
    new URL("../../src/rules/use-update-for-patch.md", import.meta.url),
    "utf8",
  );
  const snippet = source
    .replace(/\r\n/g, "\n")
    .split(section)[1]
    ?.match(/```typespec\n([\s\S]*?)```/)?.[1];
  if (!snippet) {
    throw new Error(`Missing documentation snippet: ${section}`);
  }
  return `${header} ${widget} ${snippet}`;
}

describe("use-update-for-patch", () => {
  it("accepts an unscoped client name override", async () => {
    await tester
      .expect(`${header} @clientName("updateWidget") @patch @route("/item") op modify(): string;`)
      .toBeValid();
  });

  it("reports an invalid unscoped client name on the authored operation", async () => {
    await tester
      .expect(`${header} @clientName("modifyWidget") @patch @route("/item") op update(): string;`)
      .toEmitDiagnostics([diagnostic("modifyWidget", "update")]);
  });

  it("ignores emitter-scoped overrides of a compliant default name", async () => {
    await tester
      .expect(
        `${header} @clientName("modifyWidget", "csharp") @patch @route("/item") op update(): string;`,
      )
      .toBeValid();
  });

  it("does not let an emitter-scoped override mask an invalid default name", async () => {
    await tester
      .expect(
        `${header} @clientName("updateWidget", "python") @patch @route("/item") op modify(): string;`,
      )
      .toEmitDiagnostics([diagnostic("modify")]);
  });

  it("uses the unscoped name when scoped and unscoped overrides coexist", async () => {
    await tester
      .expect(
        `${header}
        @clientName("updateWidget")
        @clientName("modifyWidget", "csharp")
        @patch @route("/item") op modify(): string;`,
      )
      .toBeValid();
  });

  it("does not let a scoped name mask an invalid unscoped override", async () => {
    await tester
      .expect(
        `${header}
        @clientName("modifyWidget")
        @clientName("updateWidget", "python")
        @patch @route("/item") op update(): string;`,
      )
      .toEmitDiagnostics([diagnostic("modifyWidget", "update")]);
  });

  it("honors client names on standard ARM patch template aliases", async () => {
    await tester
      .expect(
        `${header} ${widget}
        @armResourceOperations interface Widgets {
          @clientName("updateWidget")
          modify is ArmResourcePatchSync<Widget, Properties = WidgetProperties>;
        }`,
      )
      .toBeValid();
  });

  it("reports invalid common client names on standard ARM patch template aliases", async () => {
    await tester
      .expect(
        `${header} ${widget}
        @armResourceOperations interface Widgets {
          @clientName("modifyWidget")
          update is ArmResourcePatchSync<Widget, Properties = WidgetProperties>;
        }`,
      )
      .toEmitDiagnostics([diagnostic("modifyWidget", "update")]);
  });

  it("normalizes exact client names", async () => {
    await tester
      .expect(
        `${header} @clientName(exact("UpdateWidget")) @patch @route("/item") op modify(): string;`,
      )
      .toBeValid();
  });

  it("reports invalid exact client names on the authored operation", async () => {
    await tester
      .expect(
        `${header} @clientName(exact("ModifyWidget")) @patch @route("/item") op update(): string;`,
      )
      .toEmitDiagnostics([diagnostic("ModifyWidget", "update")]);
  });

  it("uses the friendly name fallback", async () => {
    await tester
      .expect(`${header} @friendlyName("updateWidget") @patch @route("/item") op modify(): string;`)
      .toBeValid();
  });

  it("reports an invalid friendly name on the authored operation", async () => {
    await tester
      .expect(`${header} @friendlyName("modifyWidget") @patch @route("/item") op update(): string;`)
      .toEmitDiagnostics([diagnostic("modifyWidget", "update")]);
  });

  it("prefers a common client name over a friendly name", async () => {
    await tester
      .expect(
        `${header}
        @clientName("updateWidget") @friendlyName("modifyWidget")
        @patch @route("/item") op modify(): string;`,
      )
      .toBeValid();
  });

  // cspell:ignore updat
  it.each(["patch", "modify", "create", "patch_Update", "u", "updat"])(
    "rejects PATCH name %s",
    async (name) => {
      await tester
        .expect(`${header} @patch @route("/item") op ${name}(): string;`)
        .toEmitDiagnostics([diagnostic(name)]);
    },
  );

  it.each(["update", "updateWidget", "updateTags", "UpdateTags", "UPDATE", "uPdAtEWidget"])(
    "accepts update prefix %s",
    async (name) => {
      await tester.expect(`${header} @patch @route("/item") op ${name}(): string;`).toBeValid();
    },
  );

  it.each(["get", "put", "post", "delete", "head"])("ignores HTTP verb %s", async (verb) => {
    await tester
      .expect(`${header} @${verb} @route("/item") op modify(): { @statusCode code: 204 };`)
      .toBeValid();
  });

  it.each([200, 201, 202, 204])(
    "checks PATCH names independently of response code %s",
    async (code) => {
      await tester
        .expect(`${header} @patch @route("/item") op modify(): { @statusCode code: ${code} };`)
        .toEmitDiagnostics([diagnostic("modify")]);
    },
  );

  it("does not let an interface name mask the operation prefix", async () => {
    await tester
      .expect(`${header} @route("/item") interface UpdateWidgets { @patch op modify(): string; }`)
      .toEmitDiagnostics([diagnostic("modify")]);
  });

  it("checks ordinary service namespaces without provider metadata", async () => {
    await tester
      .expect(`@service namespace Contoso { @patch @route("/item") op modify(): string; }`)
      .toEmitDiagnostics([diagnostic("modify")]);
  });

  it("reports distinct offending endpoints on their authored operations", async () => {
    await tester
      .expect(
        `${header}
        @patch @route("/first") op modifyFirst(): string;
        @patch @route("/second") op modifySecond(): string;`,
      )
      .toEmitDiagnostics([diagnostic("modifyFirst"), diagnostic("modifySecond")]);
  });

  it("ignores an operationId that would mask an invalid common SDK name", async () => {
    await tester
      .expect(
        `${header}
        @TypeSpec.OpenAPI.operationId("Widgets_Update")
        @patch @route("/item") op modify(): string;`,
      )
      .toEmitDiagnostics([diagnostic("modify")]);
  });

  it("ignores an operationId that would invalidate a compliant common SDK name", async () => {
    await tester
      .expect(
        `${header}
        @TypeSpec.OpenAPI.operationId("Widgets_Modify")
        @patch @route("/item") op update(): string;`,
      )
      .toBeValid();
  });

  it("retains historical operations but does not simulate historical names", async () => {
    await tester
      .expect(
        `
        @service @armProviderNamespace @versioned(Versions)
        @armCommonTypesVersion(CommonTypes.Versions.v5)
        namespace Arm;
        enum Versions { v1, v2 }
        @removed(Versions.v2) @route("/old") @patch op modify(): string;
        @renamedFrom(Versions.v2, "modify") @route("/renamed") @patch op update(): string;
      `,
      )
      .toEmitDiagnostics([diagnostic("modify")]);
  });

  it("validates the exact incorrect documentation example", async () => {
    await tester
      .expect(await documentationSnippet("#### ❌ Incorrect"))
      .toEmitDiagnostics([diagnostic("modify")]);
  });

  it("validates the exact correct documentation example", async () => {
    await tester.expect(await documentationSnippet("#### ✅ Correct")).toBeValid();
  });

  it("validates the exact common client name documentation example", async () => {
    await tester.expect(await documentationSnippet("## Impact")).toBeValid();
  });

  it("validates the exact suppression documentation example", async () => {
    // The direct rule tester collects diagnostics before compiler suppression is applied.
    await runner.compile(await documentationSnippet("## Suppression"), {
      compilerOptions: {
        linterRuleSet: {
          enable: { "@azure-tools/typespec-client-generator-core/use-update-for-patch": true },
        },
      },
    });
  });
});

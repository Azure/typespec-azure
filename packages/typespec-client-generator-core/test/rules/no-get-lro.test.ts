import {
  createLinterRuleTester,
  expectDiagnostics,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noGetLroRule } from "../../src/rules/no-get-lro.js";
import { ArmTester, SimpleTester } from "../tester.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await SimpleTester.createInstance(),
    noGetLroRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-client-generator-core/no-get-lro",
  message:
    "GET SDK operations must not be marked as long-running. Remove the Legacy.markAsLro declaration.",
};

it.each(["", '("csharp")', '("java, python")', '("!csharp")', '(#{scope: "javascript"})'])(
  "reports an accepted GET LRO declaration with scope %s",
  async (scope) => {
    await tester
      .expect(
        `
      @service namespace Test;
      @Legacy.markAsLro${scope}
      @get @route("/read") op read(): { value: string; };
    `,
      )
      .toEmitDiagnostics(diagnostic);
  },
);

it("reports once when several SDK scopes mark the same GET", async () => {
  await tester
    .expect(
      `
    @service namespace Test;
    @Legacy.markAsLro("csharp")
    @Legacy.markAsLro("java")
    @get @route("/read") op read(): { value: string; };
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("allows an unmarked GET", async () => {
  await tester
    .expect(
      `
    @service namespace Test;
    @get @route("/read") op read(): { value: string; };
  `,
    )
    .toBeValid();
});

it("excludes accepted declarations outside the HTTP service", async () => {
  await tester
    .expect(
      `
    @service namespace Api {
      @get @route("/read") op read(): { value: string; };
    }
    namespace Helpers {
      @Legacy.markAsLro
      @get @route("/helper") op helper(): { value: string; };
    }
  `,
    )
    .toBeValid();
});

it("checks accepted declarations in the global HTTP service", async () => {
  await tester
    .expect(
      `
    @Legacy.markAsLro
    @get @route("/read") op read(): { value: string; };
  `,
    )
    .toEmitDiagnostics(diagnostic);
});
it("allows a marked non-GET operation", async () => {
  await tester
    .expect(
      `
    @service namespace Test;
    @Legacy.markAsLro
    @post @route("/start") op start(): { value: string; };
  `,
    )
    .toBeValid();
});

it("does not replace the invalid-marker diagnostic", async () => {
  await tester
    .expect(
      `
    @service namespace Test;
    #suppress "@azure-tools/typespec-client-generator-core/invalid-mark-as-lro-target" "Test rejected marker."
    @Legacy.markAsLro
    @get @route("/read") op read(): string;
  `,
    )
    .toBeValid();
});

it("reports a Legacy-marked ARM read without relying on an emitted extension", async () => {
  const armTester = createLinterRuleTester(
    await ArmTester.createInstance(),
    noGetLroRule,
    "@azure-tools/typespec-client-generator-core",
  );
  await armTester
    .expect(
      `
    @armProviderNamespace namespace Microsoft.Test;
    model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
    @armResourceOperations interface Widgets {
      @Azure.ClientGenerator.Core.Legacy.markAsLro("csharp")
      @OpenAPI.extension("x-ms-long-running-operation", false)
      read is ArmResourceRead<Widget>;
    }
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("leaves native GET LROs to the ARM rule", async () => {
  const armTester = createLinterRuleTester(
    await ArmTester.createInstance(),
    noGetLroRule,
    "@azure-tools/typespec-client-generator-core",
  );
  await armTester
    .expect(
      `
    @armProviderNamespace namespace Microsoft.Test;
    model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
    @armResourceOperations interface Widgets {
      read is ArmResourceRead<Widget, Response = ArmAcceptedLroResponse>;
    }
  `,
    )
    .toBeValid();
});

it("registers both checks without reporting native metadata as an SDK declaration", async () => {
  const [, diagnostics] = await ArmTester.compileAndDiagnose(
    `
    @armProviderNamespace namespace Microsoft.Test;
    model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
    @armResourceOperations interface Widgets {
      read is ArmResourceRead<Widget, Response = ArmAcceptedLroResponse>;
    }
    @Azure.ClientGenerator.Core.Legacy.markAsLro
    @get @route("/legacy") op legacyRead(): { value: string; };
  `,
    {
      compilerOptions: {
        linterRuleSet: {
          enable: {
            "@azure-tools/typespec-azure-resource-manager/no-get-lro": true,
            "@azure-tools/typespec-client-generator-core/no-get-lro": true,
          },
        },
      },
    },
  );
  expectDiagnostics(
    [...diagnostics].sort((a, b) => a.code.localeCompare(b.code)),
    [
      { code: "@azure-tools/typespec-azure-resource-manager/no-get-lro" },
      { code: "@azure-tools/typespec-client-generator-core/no-get-lro" },
    ],
  );
});

import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { getEffectiveClientApiVersionOverride } from "../../src/decorators.js";
import type { SdkClientType, SdkServiceOperation } from "../../src/interfaces.js";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
  SimpleTester,
} from "../tester.js";

const decorator = "Azure.ClientGenerator.Core.Legacy.overrideClientApiVersion";

function findClient(
  clients: SdkClientType<SdkServiceOperation>[],
  name: string,
): SdkClientType<SdkServiceOperation> | undefined {
  for (const client of clients) {
    if (client.name === name) {
      return client;
    }
    const child = findClient(client.children ?? [], name);
    if (child) {
      return child;
    }
  }
  return undefined;
}

function requireClient(
  clients: SdkClientType<SdkServiceOperation>[],
  name: string,
): SdkClientType<SdkServiceOperation> {
  const client = findClient(clients, name);
  ok(client, `Expected client ${name}`);
  return client;
}

function getApiVersionDefault(client: SdkClientType<SdkServiceOperation>): unknown {
  return client.clientInitialization.parameters.find((x) => x.isApiVersionParam)
    ?.clientDefaultValue;
}

describe("@overrideClientApiVersion", () => {
  it("overrides only an implicit interface client's API-version parameter default", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      @versioned(Versions)
      namespace WidgetService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @route("/root")
        op root(@query("api-version") apiVersion: string): void;

        @${decorator}("2099-01-01")
        interface Widgets {
          @route("/widgets")
          op get(@query("api-version") apiVersion: string): void;
        }

        interface Gadgets {
          @route("/gadgets")
          op get(@query("api-version") apiVersion: string): void;
        }
      }
    `);

    const context = await createSdkContextForTester(program);
    const { clients, enums } = context.sdkPackage;
    const root = requireClient(clients, "WidgetServiceClient");
    const widgets = requireClient(clients, "Widgets");
    const gadgets = requireClient(clients, "Gadgets");

    strictEqual(getApiVersionDefault(widgets), "2099-01-01");
    strictEqual(getApiVersionDefault(root), "2025-01-01");
    strictEqual(getApiVersionDefault(gadgets), "2025-01-01");
    deepStrictEqual(widgets.apiVersions, ["2024-01-01", "2025-01-01"]);
    deepStrictEqual(root.apiVersions, ["2024-01-01", "2025-01-01"]);

    ok(widgets.versionsEnum);
    deepStrictEqual(
      widgets.versionsEnum.values.map((x) => x.value),
      ["2024-01-01", "2025-01-01"],
    );
    strictEqual(
      widgets.versionsEnum.values.some((x) => x.value === "2099-01-01"),
      false,
    );
    strictEqual(
      enums.some((x) => x.values.some((v) => v.value === "2099-01-01")),
      false,
    );
  });

  it("rejects an explicit root client declared as an interface", async () => {
    const diagnostics = await SimpleTester.diagnose(`
      @service
      @versioned(Versions)
      namespace WidgetService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @client({ name: "WidgetsClient", service: WidgetService })
        @${decorator}("2099-01-01")
        interface WidgetsClient {
          @route("/widgets")
          op get(@query("api-version") apiVersion: string): void;
        }
      }
    `);

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-api-version-override",
      message:
        "@overrideClientApiVersion can only be applied to an interface that resolves to a subclient.",
    });
  });

  it("selects the override by emitter scope", async () => {
    const source = `
      @service
      @versioned(Versions)
      namespace WidgetService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @${decorator}("2099-01-01", "python")
        interface Widgets {
          op get(@query("api-version") apiVersion: string): void;
        }
      }
    `;

    const { program: pythonProgram } = await SimpleTester.compile(source);
    const pythonContext = await createSdkContextForTester(pythonProgram, {
      emitterName: "@azure-tools/typespec-python",
    });
    const pythonClient = requireClient(pythonContext.sdkPackage.clients, "Widgets");
    strictEqual(getApiVersionDefault(pythonClient), "2099-01-01");

    const { program: csharpProgram } = await SimpleTester.compile(source);
    const csharpContext = await createSdkContextForTester(csharpProgram, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const csharpClient = requireClient(csharpContext.sdkPackage.clients, "Widgets");
    strictEqual(getApiVersionDefault(csharpClient), "2025-01-01");
  });

  it.each(["", " ", " \t\r\n "])(
    "rejects an empty or whitespace-only version %j",
    async (version) => {
      const [, diagnostics] = await SimpleTester.compileAndDiagnose(`
      @service
      namespace WidgetService {
        @${decorator}(${JSON.stringify(version)})
        interface Widgets {
          op get(@query("api-version") apiVersion: string): void;
        }
      }
    `);

      strictEqual(diagnostics.length, 1);
      strictEqual(diagnostics[0].severity, "error");
      ok(/version.*(empty|non-empty|whitespace)/i.test(diagnostics[0].message));
    },
  );

  it.each([
    ["namespace", "namespace InvalidTarget {}"],
    ["model", "model InvalidTarget {}"],
    ["operation", "op InvalidTarget(): void;"],
  ])("only accepts interfaces, not a %s", async (_, target) => {
    const diagnostics = await SimpleTester.diagnose(`
      @service
      namespace WidgetService;

      @${decorator}("2099-01-01")
      ${target}
    `);

    expectDiagnostics(diagnostics, {
      code: "decorator-wrong-target",
    });
  });

  it("ignores an interface that is not a generated client", async () => {
    const { program } = await SimpleTester.compile(`
      @${decorator}("2099-01-01")
      interface Helper {}

      @service
      @versioned(Versions)
      namespace WidgetService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        op get(@query("api-version") apiVersion: string): void;
      }
    `);

    const context = await createSdkContextForTester(program);
    strictEqual(context.sdkPackage.clients.length, 1);
    const client = context.sdkPackage.clients[0];
    strictEqual(client.name, "WidgetServiceClient");
    strictEqual(getApiVersionDefault(client), "2025-01-01");
  });

  it("does not synthesize an API-version parameter when the client has none", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      @versioned(Versions)
      namespace WidgetService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @${decorator}("2099-01-01")
        interface Widgets {
          op get(): void;
        }
      }
    `);
    const context = await createSdkContextForTester(program);
    const client = requireClient(context.sdkPackage.clients, "Widgets");
    strictEqual(
      client.clientInitialization.parameters.some((x) => x.isApiVersionParam),
      false,
    );
    deepStrictEqual(client.apiVersions, ["2024-01-01", "2025-01-01"]);
    ok(client.versionsEnum);
    strictEqual(
      client.versionsEnum.values.some((x) => x.value === "2099-01-01"),
      false,
    );
  });

  it("cannot target a multi-service client because those clients must be namespaces", async () => {
    const [, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(
        `
          @service
          @versioned(VersionsA)
          namespace ServiceA {
            enum VersionsA { v1: "a1", v2: "a2" }
            interface OperationsA {
              op get(@query("api-version") apiVersion: string): void;
            }
          }

          @service
          @versioned(VersionsB)
          namespace ServiceB {
            enum VersionsB { v1: "b1", v2: "b2" }
            interface OperationsB {
              op get(@query("api-version") apiVersion: string): void;
            }
          }
        `,
        `
          @client({
            name: "CombinedClient",
            service: [ServiceA, ServiceB],
            autoMergeService: true,
          })
          @${decorator}("2099-01-01")
          interface CombinedClient {}
        `,
      ),
    );

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-service-multiple",
    });
  });

  it("survives projected replacement interfaces with added, removed, and renamedFrom", async () => {
    const source = `
      @service
      @versioned(Versions)
      namespace WidgetService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
          v3: "2026-01-01",
        }

        @${decorator}("2099-01-01")
        @added(Versions.v2)
        @removed(Versions.v3)
        @renamedFrom(Versions.v2, "LegacyWidgets")
        interface Widgets {
          op get(@query("api-version") apiVersion: string): void;
        }
      }
    `;

    const { program } = await SimpleTester.compile(source);
    const context = await createSdkContextForTester(program, {
      "api-version": "2025-01-01",
    });
    const client = requireClient(context.sdkPackage.clients, "Widgets");
    strictEqual(getApiVersionDefault(client), "2099-01-01");
    deepStrictEqual(client.apiVersions, ["2025-01-01"]);
    ok(client.versionsEnum);
    deepStrictEqual(
      client.versionsEnum.values.map((x) => x.value),
      ["2024-01-01", "2025-01-01"],
    );
  });

  it("isolates overridden defaults across parent and sibling clients", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      @versioned(Versions)
      namespace WidgetService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @route("/root")
        op root(@query("api-version") apiVersion: string): void;

        @${decorator}("2099-01-01")
        interface Widgets {
          @route("/widgets")
          op get(@query("api-version") apiVersion: string): void;
        }

        interface Gadgets {
          @route("/gadgets")
          op get(@query("api-version") apiVersion: string): void;
        }
      }
    `);

    const context = await createSdkContextForTester(program);
    const root = requireClient(context.sdkPackage.clients, "WidgetServiceClient");
    const widgets = requireClient(context.sdkPackage.clients, "Widgets");
    const gadgets = requireClient(context.sdkPackage.clients, "Gadgets");

    strictEqual(getApiVersionDefault(root), "2025-01-01");
    strictEqual(getApiVersionDefault(widgets), "2099-01-01");
    strictEqual(getApiVersionDefault(gadgets), "2025-01-01");
    strictEqual(widgets.apiVersionDefaultValue, "2099-01-01");
    strictEqual(root.apiVersionDefaultValue, undefined);
  });

  it("exposes the effective override for interface operations without SDK owner pointers", async () => {
    const { program, Widgets } = await SimpleTester.compile(t.code`
      @service
      namespace WidgetService {
        @${decorator}("2099-01-01")
        interface ${t.interface("Widgets")} {
          @route("/widgets")
          op get(): void;
        }
      }
    `);

    const operation = Widgets.operations.get("get");
    ok(operation);
    strictEqual(getEffectiveClientApiVersionOverride(program, operation), "2099-01-01");
  });
});

import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import type { SdkClientType, SdkServiceOperation } from "../../src/interfaces.js";
import { AzureCoreTester, createSdkContextForTester } from "../tester.js";

const decorator = "Azure.Core.Legacy.overrideApiVersion";

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

describe("@overrideApiVersion", () => {
  it("uses a direct interface override without changing version metadata", async () => {
    const { program } = await AzureCoreTester.compile(`
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
    strictEqual(widgets.apiVersionDefaultValue, "2099-01-01");
    strictEqual(root.apiVersionDefaultValue, undefined);
    deepStrictEqual(widgets.apiVersions, ["2024-01-01", "2025-01-01"]);
    deepStrictEqual(root.apiVersions, ["2024-01-01", "2025-01-01"]);

    ok(widgets.versionsEnum);
    deepStrictEqual(
      widgets.versionsEnum.values.map((x) => x.value),
      ["2024-01-01", "2025-01-01"],
    );
    strictEqual(
      enums.some((x) => x.values.some((value) => value.value === "2099-01-01")),
      false,
    );
  });

  it("inherits an override from the enclosing service namespace", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service
      @versioned(Versions)
      @${decorator}("2099-01-01")
      namespace WidgetService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @route("/root")
        op root(@query("api-version") apiVersion: string): void;

        interface Widgets {
          @route("/widgets")
          op get(@query("api-version") apiVersion: string): void;
        }
      }
    `);

    const context = await createSdkContextForTester(program);
    const root = requireClient(context.sdkPackage.clients, "WidgetServiceClient");
    const widgets = requireClient(context.sdkPackage.clients, "Widgets");

    strictEqual(getApiVersionDefault(root), "2099-01-01");
    strictEqual(getApiVersionDefault(widgets), "2099-01-01");
  });

  it("uses the nearest nested namespace override", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service
      @versioned(Versions)
      namespace WidgetService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @${decorator}("2088-01-01")
        namespace Administration {
          @${decorator}("2099-01-01")
          namespace Widgets {
            op get(@query("api-version") apiVersion: string): void;
          }
        }
      }
    `);

    const context = await createSdkContextForTester(program);
    const administration = requireClient(context.sdkPackage.clients, "Administration");
    const widgets = requireClient(context.sdkPackage.clients, "Widgets");

    strictEqual(getApiVersionDefault(administration), "2088-01-01");
    strictEqual(getApiVersionDefault(widgets), "2099-01-01");
  });

  it("gives an interface override precedence over its namespace", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service
      @versioned(Versions)
      namespace WidgetService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @${decorator}("2088-01-01")
        namespace Administration {
          @${decorator}("2099-01-01")
          interface Widgets {
            op get(@query("api-version") apiVersion: string): void;
          }
        }
      }
    `);

    const context = await createSdkContextForTester(program);
    const administration = requireClient(context.sdkPackage.clients, "Administration");
    const widgets = requireClient(context.sdkPackage.clients, "Widgets");

    strictEqual(getApiVersionDefault(administration), "2088-01-01");
    strictEqual(getApiVersionDefault(widgets), "2099-01-01");
  });

  it("applies to an explicit root interface client", async () => {
    const { program } = await AzureCoreTester.compile(`
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
          op get(@query("api-version") apiVersion: string): void;
        }
      }
    `);

    const context = await createSdkContextForTester(program);
    deepStrictEqual(
      context.sdkPackage.clients.map((client) => client.name),
      ["WidgetsClient"],
    );
    const client = requireClient(context.sdkPackage.clients, "WidgetsClient");

    strictEqual(getApiVersionDefault(client), "2099-01-01");
    strictEqual(client.apiVersionDefaultValue, "2099-01-01");
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

    const { program: pythonProgram } = await AzureCoreTester.compile(source);
    const pythonContext = await createSdkContextForTester(pythonProgram, {
      emitterName: "@azure-tools/typespec-python",
    });
    const pythonClient = requireClient(pythonContext.sdkPackage.clients, "Widgets");
    strictEqual(getApiVersionDefault(pythonClient), "2099-01-01");

    const { program: csharpProgram } = await AzureCoreTester.compile(source);
    const csharpContext = await createSdkContextForTester(csharpProgram, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const csharpClient = requireClient(csharpContext.sdkPackage.clients, "Widgets");
    strictEqual(getApiVersionDefault(csharpClient), "2025-01-01");
  });

  it("does not synthesize an API-version parameter when the client has none", async () => {
    const { program } = await AzureCoreTester.compile(`
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
    strictEqual(client.apiVersionDefaultValue, "2099-01-01");
    deepStrictEqual(client.apiVersions, ["2024-01-01", "2025-01-01"]);
    ok(client.versionsEnum);
    strictEqual(
      client.versionsEnum.values.some((x) => x.value === "2099-01-01"),
      false,
    );
  });

  it("survives projected replacement interfaces", async () => {
    const { program } = await AzureCoreTester.compile(`
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
    `);
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
});

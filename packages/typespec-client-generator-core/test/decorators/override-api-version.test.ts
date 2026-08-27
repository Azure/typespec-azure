import { deepStrictEqual, notStrictEqual, ok, strictEqual } from "assert";
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

function getApiVersionParameter(client: SdkClientType<SdkServiceOperation>) {
  return client.clientInitialization.parameters.find((x) => x.isApiVersionParam);
}

function getOperationApiVersionParameter(
  client: SdkClientType<SdkServiceOperation>,
  methodName: string,
) {
  const method = client.methods.find((x) => x.name === methodName);
  ok(method && "operation" in method, `Expected service method ${methodName}`);
  const parameter = method.operation.parameters.find((x) => x.isApiVersionParam);
  ok(parameter, `Expected API-version parameter on ${methodName}`);
  return parameter;
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
    strictEqual(getOperationApiVersionParameter(widgets, "get").clientDefaultValue, "2099-01-01");
    strictEqual(getOperationApiVersionParameter(root, "root").clientDefaultValue, "2025-01-01");
    strictEqual(getOperationApiVersionParameter(gadgets, "get").clientDefaultValue, "2025-01-01");
    notStrictEqual(getApiVersionParameter(widgets), getApiVersionParameter(root));
    notStrictEqual(getApiVersionParameter(widgets), getApiVersionParameter(gadgets));
    deepStrictEqual(widgets.apiVersions, ["2024-01-01", "2025-01-01"]);
    deepStrictEqual(root.apiVersions, ["2024-01-01", "2025-01-01"]);
    deepStrictEqual(getOperationApiVersionParameter(widgets, "get").apiVersions, [
      "2024-01-01",
      "2025-01-01",
    ]);

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
    strictEqual(getOperationApiVersionParameter(client, "get").clientDefaultValue, "2099-01-01");
    deepStrictEqual(client.apiVersions, ["2025-01-01"]);
    ok(client.versionsEnum);
    deepStrictEqual(
      client.versionsEnum.values.map((x) => x.value),
      ["2024-01-01", "2025-01-01"],
    );
  });

  it("preserves a custom API-version parameter name", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service
      @versioned(Versions)
      namespace WidgetService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @${decorator}("opaque-legacy-version")
        interface Widgets {
          op get(@query("api-version") serviceVersion: Versions): void;
        }
      }
    `);

    const context = await createSdkContextForTester(program);
    const client = requireClient(context.sdkPackage.clients, "Widgets");
    const clientParameter = getApiVersionParameter(client);
    ok(clientParameter);

    strictEqual(clientParameter.name, "serviceVersion");
    strictEqual(clientParameter.clientDefaultValue, "opaque-legacy-version");
    strictEqual(getOperationApiVersionParameter(client, "get").name, "serviceVersion");
  });

  it("uses declaration scope for each operation in the same generated client", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service
      @versioned(Versions)
      namespace WidgetService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @${decorator}("opaque-legacy-version")
        namespace Legacy {
          @route("/legacy")
          @clientLocation(WidgetService)
          op legacy(@query("api-version") apiVersion: Versions): void;
        }

        @route("/current")
        op current(@query("api-version") apiVersion: Versions): void;
      }
    `);

    const context = await createSdkContextForTester(program);
    const client = requireClient(context.sdkPackage.clients, "WidgetServiceClient");

    strictEqual(getApiVersionDefault(client), "2025-01-01");
    strictEqual(
      getOperationApiVersionParameter(client, "legacy").clientDefaultValue,
      "opaque-legacy-version",
    );
    strictEqual(
      getOperationApiVersionParameter(client, "current").clientDefaultValue,
      "2025-01-01",
    );
  });

  it("preserves an explicit client default when no override applies", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service
      @versioned(Versions)
      namespace WidgetService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        interface Widgets {
          op get(
            @query("api-version")
            @apiVersion
            @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("2024-01-01")
            apiVersion: string
          ): void;
        }
      }
    `);

    const context = await createSdkContextForTester(program);
    const client = requireClient(context.sdkPackage.clients, "Widgets");

    strictEqual(getApiVersionDefault(client), "2024-01-01");
    strictEqual(getOperationApiVersionParameter(client, "get").clientDefaultValue, "2024-01-01");
  });

  it("gives the API-version override precedence over an explicit client default", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service
      @versioned(Versions)
      namespace WidgetService {
        enum Versions {
          v1: "2024-01-01",
          v2: "2025-01-01",
        }

        @${decorator}("opaque-legacy-version")
        interface Widgets {
          op get(
            @query("api-version")
            @apiVersion
            @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("2024-01-01")
            apiVersion: string
          ): void;
        }
      }
    `);

    const context = await createSdkContextForTester(program);
    const client = requireClient(context.sdkPackage.clients, "Widgets");

    strictEqual(getApiVersionDefault(client), "opaque-legacy-version");
    strictEqual(
      getOperationApiVersionParameter(client, "get").clientDefaultValue,
      "opaque-legacy-version",
    );
  });
});

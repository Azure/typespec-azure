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

function getClient(
  clients: SdkClientType<SdkServiceOperation>[],
  name: string,
): SdkClientType<SdkServiceOperation> {
  const client = findClient(clients, name);
  if (client) {
    return client;
  }
  throw new Error(`Expected client ${name}`);
}

function getOperationApiVersionDefault(
  client: SdkClientType<SdkServiceOperation>,
  methodName: string,
): unknown {
  const method = client.methods.find((x) => x.name === methodName);
  ok(method && "operation" in method);
  const parameter = method.operation.parameters.find((x) => x.isApiVersionParam);
  ok(parameter);
  return parameter.clientDefaultValue;
}

describe("@overrideApiVersion", () => {
  it("sets the operation API-version default without changing version metadata", async () => {
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
          op get(@query("api-version") apiVersion: string): void;
        }
      }
    `);

    const context = await createSdkContextForTester(program);
    const client = getClient(context.sdkPackage.clients, "Widgets");

    strictEqual(getOperationApiVersionDefault(client, "get"), "opaque-legacy-version");
    deepStrictEqual(client.apiVersions, ["2024-01-01", "2025-01-01"]);
  });

  it("uses the declaration scope for operations moved to another client", async () => {
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
    const client = getClient(context.sdkPackage.clients, "WidgetServiceClient");

    strictEqual(getOperationApiVersionDefault(client, "legacy"), "opaque-legacy-version");
    strictEqual(getOperationApiVersionDefault(client, "current"), "2025-01-01");
  });
});

import { bearerTokenAuthenticationPolicyName } from "@azure/core-rest-pipeline";
import { readFile } from "node:fs/promises";
import { assert, describe, it } from "vitest";

import { ExampleClient } from "./generated/azure/resource-manager/example/src/index.js";

describe("Azure Resource Manager Example", () => {
  it("generates a sample from the unified YAML example", async () => {
    const fixture = new URL("./generated/azure/resource-manager/example/", import.meta.url);
    const [sample, packageJson] = await Promise.all(
      ["samples-dev/widgetsListByResourceGroupSample.ts", "package.json"].map((path) =>
        readFile(new URL(path, fixture), "utf8"),
      ),
    );
    const { name } = JSON.parse(packageJson);
    assert.strictEqual(name, "@msinternal/azure-resource-manager-example");
    assert.include(sample, "x-ms-original-file: examples.yaml#list");
    assert.include(sample, `from "${name}"`);
    assert.include(sample, 'client.widgets.listByResourceGroup("test-rg")');
  });

  it("lists widgets by resource group", async () => {
    const subscriptionId = "00000000-0000-0000-0000-000000000000";
    const client = new ExampleClient({ getToken: async () => null }, subscriptionId, {
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 0 },
    });
    client.pipeline.removePolicy({ name: bearerTokenAuthenticationPolicyName });

    const widgets = [];
    for await (const widget of client.widgets.listByResourceGroup("test-rg")) {
      widgets.push(widget);
    }

    assert.strictEqual(widgets.length, 1);
    assert.strictEqual(
      widgets[0].id,
      `/subscriptions/${subscriptionId}/resourceGroups/test-rg/providers/Microsoft.Example/widgets/widget`,
    );
    assert.strictEqual(widgets[0].name, "widget");
    assert.strictEqual(widgets[0].type, "Microsoft.Example/widgets");
    assert.strictEqual(widgets[0].properties?.description, "sample widget");
  });
});

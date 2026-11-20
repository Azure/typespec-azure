import { assert, describe, it } from "vitest";

import { ExampleClient } from "./generated/azure/resource-manager/example/src/index.js";

describe("Azure Resource Manager Example", () => {
  it("lists widgets by resource group", async () => {
    const subscriptionId = "00000000-0000-0000-0000-000000000000";
    const client = new ExampleClient(subscriptionId, {
      endpoint: "http://localhost:3002",
      allowInsecureConnection: true,
      retryOptions: { maxRetries: 0 },
    });

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

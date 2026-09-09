# Generate TypeScript samples for visibility-specific request models

Verifies that generated samples preserve the properties supplied for each visibility-specific request model, including within nested models.

## TypeSpec

```tsp
model Widget {
  @visibility(Lifecycle.Read)
  id: string;

  @visibility(Lifecycle.Create)
  createOnly: string;

  @visibility(Lifecycle.Update)
  updateOnly: string;

  name: string;
  details: Details;
}

model Details {
  @visibility(Lifecycle.Read)
  id: string;

  @visibility(Lifecycle.Create)
  createOnly: string;

  @visibility(Lifecycle.Update)
  updateOnly: string;

  value: string;
}

@route("/widgets")
@post
op createWidget(@body body: Widget): Widget;

@route("/widgets/{widgetName}")
@patch
op updateWidget(@path widgetName: string, @body body: Widget): Widget;
```

## Examples

```json for createWidget
{
  "title": "Create a widget",
  "operationId": "createWidget",
  "parameters": {
    "body": {
      "createOnly": "create-value",
      "name": "widget-name",
      "details": {
        "createOnly": "create-details-value",
        "value": "details-value"
      }
    }
  },
  "responses": {
    "200": {
      "body": {
        "id": "server-id",
        "name": "widget-name",
        "details": {
          "id": "server-details-id",
          "value": "details-value"
        }
      }
    }
  }
}
```

```json for updateWidget
{
  "title": "Update a widget",
  "operationId": "updateWidget",
  "parameters": {
    "widgetName": "widget-name",
    "body": {
      "updateOnly": "update-value",
      "name": "updated-widget-name",
      "details": {
        "updateOnly": "update-details-value",
        "value": "updated-details-value"
      }
    }
  },
  "responses": {
    "200": {
      "body": {
        "id": "server-id",
        "name": "updated-widget-name",
        "details": {
          "id": "server-details-id",
          "value": "updated-details-value"
        }
      }
    }
  }
}
```

## Configuration

```yaml
experimentalSplitModelsByVisibility: true
```

## Samples

```ts samples
/** This file path is /samples-dev/updateWidgetSample.ts */
import { TestingClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to execute updateWidget
 *
 * @summary execute updateWidget
 * x-ms-original-file: 2021-10-01-preview/json_for_updateWidget.json
 */
async function updateAWidget(): Promise<void> {
  const endpoint = process.env.TESTING_ENDPOINT || "";
  const client = new TestingClient(endpoint);
  const result = await client.updateWidget("widget-name", {
    updateOnly: "update-value",
    name: "updated-widget-name",
    details: { updateOnly: "update-details-value", value: "updated-details-value" },
  });
  console.log(result);
}

async function main(): Promise<void> {
  await updateAWidget();
}

main().catch(console.error);

/** This file path is /samples-dev/createWidgetSample.ts */
import { TestingClient } from "@azure/internal-test";

/**
 * This sample demonstrates how to execute createWidget
 *
 * @summary execute createWidget
 * x-ms-original-file: 2021-10-01-preview/json_for_createWidget.json
 */
async function createAWidget(): Promise<void> {
  const endpoint = process.env.TESTING_ENDPOINT || "";
  const client = new TestingClient(endpoint);
  const result = await client.createWidget({
    createOnly: "create-value",
    name: "widget-name",
    details: { createOnly: "create-details-value", value: "details-value" },
  });
  console.log(result);
}

async function main(): Promise<void> {
  await createAWidget();
}

main().catch(console.error);
```

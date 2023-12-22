import { describe, it } from "vitest";
import { diffSameVersions, expectDiffCode } from "./test-host.js";

describe("typespec-diff: rule test", () => {
  it("added property", async () => {
    const oldSpec = `@doc("A widget.")
    @resource("widgets")
    model Widget {
      @key("widgetName")
      @doc("The widget name.")
      @visibility("read")
      name: string;
      @doc("the properties")
      properties: string;
    }
    interface Widgets {
      // Operation Status
      @doc("Gets status of a Widget operation.")
      getWidgetOperationStatus is GetResourceOperationStatus<Widget>;
      // Widget Operations
      @doc("Creates or updates a Widget asynchronously")
      @pollingOperation(Widgets.getWidgetOperationStatus)
      createOrUpdateWidget is LongRunningResourceCreateOrUpdate<
        Widget,
        {
          parameters: RepeatabilityRequestHeaders;
          response: RepeatabilityResponseHeaders;
        }
      >;
    }
    `;
    const newSpec = `
    @doc("A widget.")
    @resource("widgets")
    model Widget {
      @key("widgetName")
      @doc("The widget name.")
      @visibility("read")
      name: string;
      @doc("the properties")
      properties: string;
      @doc("The ID of the widget's manufacturer.")
      manufacturerId: string;
    }
    interface Widgets {
      // Operation Status
      @doc("Gets status of a Widget operation.")
      getWidgetOperationStatus is GetResourceOperationStatus<Widget>;
      // Widget Operations
      @doc("Creates or updates a Widget asynchronously")
      @pollingOperation(Widgets.getWidgetOperationStatus)
      createOrUpdateWidget is LongRunningResourceCreateOrUpdate<
        Widget,
        {
          parameters: RepeatabilityRequestHeaders;
          response: RepeatabilityResponseHeaders;
        }
      >;
    }`;
    const result = await diffSameVersions(oldSpec, newSpec);
    expectDiffCode(
      "AddedRequiredProperty",
      [
        {
          severity: "error",
          message:
            "The required property 'manufacturerId' was added in the new version '2022-08-31'.",
          code: "AddedRequiredProperty",
          old: "",
          new: "/test/main.tsp:20:7",
          versions: { oldVersion: "2022-08-31", newVersion: "2022-08-31" },
        },
      ],
      result
    );
    const reverseResult = await diffSameVersions(oldSpec, newSpec, true);
    expectDiffCode(
      "RemovedProperty",
      [
        {
          severity: "error",
          message: "The property 'manufacturerId' was removed from the new version '2022-08-31'.",
          code: "RemovedProperty",
          old: "/test/main.tsp:20:7",
          new: "",
          versions: { oldVersion: "2022-08-31", newVersion: "2022-08-31" },
        },
      ],
      reverseResult
    );
  });
  it("changed path", async () => {
    const result = await diffSameVersions(
      `   @doc("A widget.")
    @resource("widgets")
    model Widget {
      @key("widgetName")
      @doc("The widget name.")
      @visibility("read")
      name: string;
      @doc("the properties")
      properties: string;
    }
    interface Widgets {
      // Operation Status
      @doc("Gets status of a Widget operation.")
      getWidgetOperationStatus is GetResourceOperationStatus<Widget>;
      // Widget Operations
      @doc("Creates or updates a Widget asynchronously")
      @pollingOperation(Widgets.getWidgetOperationStatus)
      createOrUpdateWidget is LongRunningResourceCreateOrUpdate<
        Widget,
        {
          parameters: RepeatabilityRequestHeaders;
          response: RepeatabilityResponseHeaders;
        }
      >;
    }
    `,
      `
    @doc("A widget.")
    @resource("widgets")
    model Widget {
      @key("widgetsName")
      @doc("The widget name.")
      @visibility("read")
      name: string;
      @doc("the properties")
      properties: string;
      @doc("The ID of the widget's manufacturer.")
      manufacturerId: string;
    }
    interface Widgets {
      // Operation Status
      @doc("Gets status of a Widget operation.")
      getWidgetOperationStatus is GetResourceOperationStatus<Widget>;
      // Widget Operations
      @doc("Creates or updates a Widget asynchronously")
      @pollingOperation(Widgets.getWidgetOperationStatus)
      createOrUpdateWidget is LongRunningResourceCreateOrUpdate<
        Widget,
        {
          parameters: RepeatabilityRequestHeaders;
          response: RepeatabilityResponseHeaders;
        }
      >;
    }`
    );
    expectDiffCode(
      "ChangedPath",
      [
        {
          severity: "error",
          message:
            "The path for operation was changed from  '/widgets/{widgetName}/operations/{operationId}' to '/widgets/{widgetsName}/operations/{operationId}'.",
          code: "ChangedPath",
          old: "/test/main.tsp:22:7",
          new: "/test/main.tsp:25:7",
          versions: { oldVersion: "2022-08-31", newVersion: "2022-08-31" },
        },
        {
          severity: "error",
          message:
            "The path for operation was changed from  '/widgets/{widgetName}' to '/widgets/{widgetsName}'.",
          code: "ChangedPath",
          old: "/test/main.tsp:25:7",
          new: "/test/main.tsp:28:7",
          versions: { oldVersion: "2022-08-31", newVersion: "2022-08-31" },
        },
      ],
      result
    );
  });
  it("LRO status changed", async () => {
    const result = await diffSameVersions(
      `@doc("A widget.")
    @resource("widgets")
    model Widget {
      @key("widgetName")
      @doc("The widget name.")
      @visibility("read")
      name: string;
      @doc("the properties")
      properties: string;
    }
    interface Widgets {
      // Operation Status
      @doc("Gets status of a Widget operation.")
      getWidgetOperationStatus is GetResourceOperationStatus<Widget>;
      // Widget Operations
      @doc("Creates or updates a Widget asynchronously")
      @pollingOperation(Widgets.getWidgetOperationStatus)
      createOrUpdateWidget is LongRunningResourceCreateOrUpdate<
        Widget,
        {
          parameters: RepeatabilityRequestHeaders;
          response: RepeatabilityResponseHeaders;
        }
      >;
    }
    `,
      `
    @doc("A widget.")
    @resource("widgets")
    model Widget {
      @key("widgetsName")
      @doc("The widget name.")
      @visibility("read")
      name: string;
      @doc("the properties")
      properties: string;
      @doc("The ID of the widget's manufacturer.")
      manufacturerId: string;
    }
    interface Widgets {
      // Operation Status
      @doc("Gets status of a Widget operation.")
      getWidgetOperationStatus is GetResourceOperationStatus<Widget>;
      // Widget Operations
      @doc("Creates or updates a Widget asynchronously")
      createOrUpdateWidget is LongRunningResourceCreateOrUpdate<
        Widget,
        {
          parameters: RepeatabilityRequestHeaders;
          response: RepeatabilityResponseHeaders;
        }
      >;
    }`
    );
    expectDiffCode(
      "RemovedLongrunningOperationSupport",
      [
        {
          severity: "error",
          message: "Th operation 'createOrUpdateWidget was no longer a long running operation.",
          code: "RemovedLongrunningOperationSupport",
          old: "/test/main.tsp:25:7",
          new: "/test/main.tsp:28:7",
          versions: { oldVersion: "2022-08-31", newVersion: "2022-08-31" },
        },
      ],
      result
    );
  });
});

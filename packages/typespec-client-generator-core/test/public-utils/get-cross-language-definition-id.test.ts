import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("parameter's crossLanguageDefinitionId", async () => {
  runner = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core", "Azure.Core.Traits"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runner.compileWithBuiltInAzureCoreService(`
    alias ServiceTraits = SupportsRepeatableRequests &
    SupportsConditionalRequests &
    SupportsClientRequestId;
    
    @route("service-status")
    op getServiceStatus is RpcOperation<
      {},
      {
        statusString: string;
      },
      ServiceTraits
    >;
  `);

  const sdkPackage = runner.context.sdkPackage;
  strictEqual(
    sdkPackage.clients[0].clientInitialization.parameters[1].crossLanguageDefinitionId,
    "My.Service.getServiceStatus.apiVersion",
  );
  const getServiceStatus = sdkPackage.clients[0].methods[0];
  strictEqual(getServiceStatus.kind, "basic");
  strictEqual(
    getServiceStatus.parameters[0].crossLanguageDefinitionId,
    "My.Service.getServiceStatus.clientRequestId",
  );
  strictEqual(
    getServiceStatus.parameters[1].crossLanguageDefinitionId,
    "My.Service.getServiceStatus.accept",
  );
  const operation = getServiceStatus.operation;
  strictEqual(
    operation.parameters[0].crossLanguageDefinitionId,
    "My.Service.getServiceStatus.apiVersion",
  );
  strictEqual(
    operation.parameters[1].crossLanguageDefinitionId,
    "My.Service.getServiceStatus.clientRequestId",
  );
  strictEqual(
    operation.parameters[2].crossLanguageDefinitionId,
    "My.Service.getServiceStatus.accept",
  );
});

it("endpoint's crossLanguageDefinitionId", async () => {
  runner = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core", "Azure.Core.Traits"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runner.compile(`
    @service(#{
      title: "Contoso Widget Manager",
    })
    @server(
      "{url}/widget",
      "Contoso Widget APIs",
      {
        url: string,
      }
    )
    @versioned(Contoso.WidgetManager.Versions)
    namespace Contoso.WidgetManager;

    enum Versions {
          "2022-08-30",
    }

    op test(): void;
  `);

  const sdkPackage = runner.context.sdkPackage;
  const initialization = sdkPackage.clients[0].clientInitialization;
  const endpoint = initialization.parameters[0];
  strictEqual(endpoint.crossLanguageDefinitionId, "Contoso.WidgetManager.endpoint");
  strictEqual(endpoint.type.kind, "union");
  strictEqual(endpoint.type.crossLanguageDefinitionId, "Contoso.WidgetManager.Endpoint");
  strictEqual(endpoint.type.variantTypes[0].kind, "endpoint");
  strictEqual(
    endpoint.type.variantTypes[0].templateArguments[0].crossLanguageDefinitionId,
    "Contoso.WidgetManager.url",
  );
  strictEqual(endpoint.type.variantTypes[1].kind, "endpoint");
  strictEqual(
    endpoint.type.variantTypes[1].templateArguments[0].crossLanguageDefinitionId,
    "Contoso.WidgetManager.endpoint",
  );
});

it("enum value's crossLanguageDefinitionId", async () => {
  await runner.compile(`
    @service({
      title: "Widget Service",
    })
    namespace WidgetService;

    enum Color {
      Red: "red",
      Green: "green",
      Blue: "blue",
    }

    model Widget {
      color: Color;
    }

    op getWidget(): Widget;
  `);

  const sdkPackage = runner.context.sdkPackage;
  const models = Array.from(sdkPackage.models);
  const widgetModel = models.find((m) => m.name === "Widget");
  strictEqual(widgetModel !== undefined, true);
  const colorProperty = widgetModel!.properties[0];
  strictEqual(colorProperty.type.kind, "enum");
  const colorEnum = colorProperty.type;
  strictEqual(colorEnum.crossLanguageDefinitionId, "WidgetService.Color");
  
  // Test enum values
  strictEqual(colorEnum.values.length, 3);
  strictEqual(colorEnum.values[0].name, "Red");
  strictEqual(colorEnum.values[0].crossLanguageDefinitionId, "WidgetService.Color.Red");
  strictEqual(colorEnum.values[1].name, "Green");
  strictEqual(colorEnum.values[1].crossLanguageDefinitionId, "WidgetService.Color.Green");
  strictEqual(colorEnum.values[2].name, "Blue");
  strictEqual(colorEnum.values[2].crossLanguageDefinitionId, "WidgetService.Color.Blue");
});

it("union enum value's crossLanguageDefinitionId", async () => {
  runner = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    emitterName: "@azure-tools/typespec-python",
  });
  await runner.compile(`
    @service({
      title: "Widget Service",
    })
    namespace WidgetService;

    union Status {
      string,
      Active: "active",
      Inactive: "inactive",
      Pending: "pending",
    }

    model Widget {
      status: Status;
    }

    op getWidget(): Widget;
  `);

  const sdkPackage = runner.context.sdkPackage;
  const models = Array.from(sdkPackage.models);
  const widgetModel = models.find((m) => m.name === "Widget");
  strictEqual(widgetModel !== undefined, true);
  const statusProperty = widgetModel!.properties[0];
  strictEqual(statusProperty.type.kind, "enum");
  const statusEnum = statusProperty.type;
  strictEqual(statusEnum.crossLanguageDefinitionId, "WidgetService.Status");
  strictEqual(statusEnum.isUnionAsEnum, true);
  
  // Test union enum values
  strictEqual(statusEnum.values.length, 3);
  strictEqual(statusEnum.values[0].name, "Active");
  strictEqual(statusEnum.values[0].crossLanguageDefinitionId, "WidgetService.Status.Active");
  strictEqual(statusEnum.values[1].name, "Inactive");
  strictEqual(statusEnum.values[1].crossLanguageDefinitionId, "WidgetService.Status.Inactive");
  strictEqual(statusEnum.values[2].name, "Pending");
  strictEqual(statusEnum.values[2].crossLanguageDefinitionId, "WidgetService.Status.Pending");
});

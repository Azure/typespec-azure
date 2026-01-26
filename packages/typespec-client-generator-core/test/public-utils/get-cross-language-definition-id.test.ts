import { strictEqual } from "assert";
import { it } from "vitest";
import {
  AzureCoreTester,
  AzureCoreTesterWithService,
  createSdkContextForTester,
  SimpleTesterWithService,
} from "../tester.js";

it("parameter's crossLanguageDefinitionId", async () => {
  const { program } = await AzureCoreTesterWithService.compile(`
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
  const context = await createSdkContextForTester(program);

  const sdkPackage = context.sdkPackage;
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
  const { program } = await AzureCoreTester.compile(`
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
  const context = await createSdkContextForTester(program);

  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleTesterWithService.compile(`
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
  const context = await createSdkContextForTester(program);

  const sdkPackage = context.sdkPackage;
  const models = Array.from(sdkPackage.models);
  const widgetModel = models.find((m) => m.name === "Widget");
  strictEqual(widgetModel !== undefined, true);
  const colorProperty = widgetModel!.properties[0];
  strictEqual(colorProperty.type.kind, "enum");
  const colorEnum = colorProperty.type;
  strictEqual(colorEnum.crossLanguageDefinitionId, "TestService.Color");

  // Test enum values
  strictEqual(colorEnum.values.length, 3);
  strictEqual(colorEnum.values[0].name, "Red");
  strictEqual(colorEnum.values[0].crossLanguageDefinitionId, "TestService.Color.Red");
  strictEqual(colorEnum.values[1].name, "Green");
  strictEqual(colorEnum.values[1].crossLanguageDefinitionId, "TestService.Color.Green");
  strictEqual(colorEnum.values[2].name, "Blue");
  strictEqual(colorEnum.values[2].crossLanguageDefinitionId, "TestService.Color.Blue");
});

it("union enum value's crossLanguageDefinitionId", async () => {
  const { program } = await SimpleTesterWithService.compile(`
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
  const context = await createSdkContextForTester(program);

  const sdkPackage = context.sdkPackage;
  const models = Array.from(sdkPackage.models);
  const widgetModel = models.find((m) => m.name === "Widget");
  strictEqual(widgetModel !== undefined, true);
  const statusProperty = widgetModel!.properties[0];
  strictEqual(statusProperty.type.kind, "enum");
  const statusEnum = statusProperty.type;
  strictEqual(statusEnum.crossLanguageDefinitionId, "TestService.Status");
  strictEqual(statusEnum.isUnionAsEnum, true);

  // Test union enum values - union enum values only have value name as crossLanguageDefinitionId
  strictEqual(statusEnum.values.length, 3);
  strictEqual(statusEnum.values[0].name, "Active");
  strictEqual(statusEnum.values[0].crossLanguageDefinitionId, "Active");
  strictEqual(statusEnum.values[1].name, "Inactive");
  strictEqual(statusEnum.values[1].crossLanguageDefinitionId, "Inactive");
  strictEqual(statusEnum.values[2].name, "Pending");
  strictEqual(statusEnum.values[2].crossLanguageDefinitionId, "Pending");
});

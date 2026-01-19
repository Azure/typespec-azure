import { strictEqual } from "assert";
import { it } from "vitest";
import { AzureCoreTester, AzureCoreServiceTester, createSdkContextForTester } from "../tester.js";

it("parameter's crossLanguageDefinitionId", async () => {
  const { program } = await AzureCoreServiceTester.compile(`
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
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-java" });

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
  const context = await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-java" });

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

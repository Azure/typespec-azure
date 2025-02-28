import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: getCrossLanguageDefinitionId", () => {
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
      sdkPackage.clients[0].initialization.properties[1].crossLanguageDefinitionId,
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
        @useDependency(Azure.Core.Versions.v1_0_Preview_2)
        "2022-08-30",
      }

      op test(): void;
    `);

    const sdkPackage = runner.context.sdkPackage;
    const initialization = sdkPackage.clients[0].initialization;
    const endpoint = initialization.properties[0];
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
});

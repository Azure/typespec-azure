import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { AzureCoreTester, createSdkContextForTester, SimpleTester } from "../tester.js";

it("models only package", async () => {
  const { program } = await SimpleTester.compile(`
    @usage(Usage.input | Usage.output)
    namespace EventGridClient {
      model CloudEvent {
        id: string;
      }
    }
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.models.length, 1);
  strictEqual(sdkPackage.models[0].name, "CloudEvent");
  strictEqual(sdkPackage.clients.length, 0);
});

it("with azure and versioning decorators", async () => {
  const { program } = await AzureCoreTester.compile(`
    @usage(Usage.input | Usage.output)
    @versioned(ServiceApiVersions)
    namespace EventGridClient {
      enum ServiceApiVersions {
        v2018_01_01: "2018-01-01",
        v2024_01_01: "2024-01-01",
      }
      /**
       * CloudEvent comments
       */
      model CloudEvent {
        /**
         * id comments
         */
        id: string;
      }

      /**
       * Healthcare comments
       */
      model HealthcareFhirResourceCreatedEventData {
        /**
         * resourceVersionId comments
         */
        @added(ServiceApiVersions.v2024_01_01)
        resourceVersionId: int64;
      }
    }
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
  });
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.models.length, 2);
  const cloudEventModel = sdkPackage.models.find((x) => x.name === "CloudEvent");
  ok(cloudEventModel);
  strictEqual(cloudEventModel.properties.length, 1);
  const idProperty = cloudEventModel.properties[0];
  strictEqual(idProperty.name, "id");
  strictEqual(idProperty.kind, "property");
  deepStrictEqual(idProperty.apiVersions, ["2018-01-01", "2024-01-01"]);

  const healthcareEventDataModel = sdkPackage.models.find(
    (x) => x.name === "HealthcareFhirResourceCreatedEventData",
  );
  ok(healthcareEventDataModel);
  strictEqual(healthcareEventDataModel.properties.length, 1);
  const resourceVersionIdProperty = healthcareEventDataModel.properties[0];
  strictEqual(resourceVersionIdProperty.name, "resourceVersionId");
  strictEqual(resourceVersionIdProperty.kind, "property");
  deepStrictEqual(resourceVersionIdProperty.apiVersions, ["2024-01-01"]);
});

import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});
it("models only package", async () => {
  await runner.compile(`
    @usage(Usage.input | Usage.output)
    namespace EventGridClient {
      model CloudEvent {
        id: string;
      }
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.models.length, 1);
  strictEqual(sdkPackage.models[0].name, "CloudEvent");
  strictEqual(sdkPackage.clients.length, 0);
});

it("with azure and versioning decorators", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithCore.compile(`
    @usage(Usage.input | Usage.output)
    @versioned(ServiceApiVersions)
    namespace EventGridClient {
      enum ServiceApiVersions {
        @useDependency(Versions.v1_0_Preview_2)
        v2018_01_01: "2018-01-01",
        @useDependency(Versions.v1_0_Preview_2)
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
  const sdkPackage = runnerWithCore.context.sdkPackage;
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

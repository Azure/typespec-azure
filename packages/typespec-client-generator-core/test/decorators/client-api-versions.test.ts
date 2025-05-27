import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { UsageFlags } from "../../src/interfaces.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("add older api versions", async () => {
  const [_, diagnostics] = await runner.compileAndDiagnoseWithCustomization(
    `
    @service
    @versioned(Versions)
    namespace My.Service {
      enum Versions { v4, v5, v6 };
      op func(): void;
    }
  `,
    `
    @@clientApiVersions(My.Service, ClientApiVersions);
    enum ClientApiVersions { v1, v2, v3, ...My.Service.Versions };
  `,
  );
  expectDiagnosticEmpty(diagnostics);
  const sdkPackage = runner.context.sdkPackage;
  const apiVersionEnum = sdkPackage.enums.find((x) => x.usage & UsageFlags.ApiVersionEnum);
  ok(apiVersionEnum);
  strictEqual(apiVersionEnum.name, "ClientApiVersions");
  strictEqual(apiVersionEnum.values.length, 6);
  deepStrictEqual(
    apiVersionEnum.values.map((x) => x.name),
    ["v1", "v2", "v3", "v4", "v5", "v6"],
  );

  const client = sdkPackage.clients[0];
  strictEqual(client.apiVersions.length, 3);
  deepStrictEqual(client.apiVersions, ["v4", "v5", "v6"]);
});

it("add newer api versions", async () => {
  await runner.compileWithCustomization(
    `
    @service
    @versioned(Versions)
    namespace My.Service {
      enum Versions { v4, v5, v6 };
      op func(): void;
    }
  `,
    `
    @@clientApiVersions(My.Service, ClientApiVersions);
    enum ClientApiVersions { ...My.Service.Versions, v7, v8, v9 };
  `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const apiVersionEnum = sdkPackage.enums.find((x) => x.usage & UsageFlags.ApiVersionEnum);
  ok(apiVersionEnum);
  strictEqual(apiVersionEnum.name, "ClientApiVersions");
  strictEqual(apiVersionEnum.values.length, 6);
  deepStrictEqual(
    apiVersionEnum.values.map((x) => x.name),
    ["v4", "v5", "v6", "v7", "v8", "v9"],
  );

  const client = sdkPackage.clients[0];
  strictEqual(client.apiVersions.length, 3);
  deepStrictEqual(client.apiVersions, ["v4", "v5", "v6"]);
});

it("api version parameter", async () => {
  await runner.compileWithCustomization(
    `
    @service
    @versioned(Versions)
    namespace My.Service {
      enum Versions { v4, v5, v6 };

      op get(@query("api-version") apiVersion: string): void;
    }
  `,
    `
    @@clientApiVersions(My.Service, ClientApiVersions);
    enum ClientApiVersions { v1, v2, v3, ...My.Service.Versions };
  `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const client = sdkPackage.clients[0];
  strictEqual(client.clientInitialization.parameters.length, 2);
  const apiVersionParam = client.clientInitialization.parameters.find((x) => x.isApiVersionParam);
  ok(apiVersionParam);
  strictEqual(apiVersionParam.apiVersions.length, 3);
  deepStrictEqual(apiVersionParam.apiVersions, ["v4", "v5", "v6"]);
});

it("model .apiVersions", async () => {
  await runner.compileWithCustomization(
    `
    @service
    @versioned(Versions)
    namespace My.Service {
      enum Versions { v4, v5, v6 };

      @usage(Usage.input)
      model MyModel {
        id: string;
      }
    }
  `,
    `
    @@clientApiVersions(My.Service, ClientApiVersions);
    enum ClientApiVersions { v1, v2, v3, ...My.Service.Versions };
  `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const model = sdkPackage.models[0];
  strictEqual(model.apiVersions.length, 3);
  deepStrictEqual(model.apiVersions, ["v4", "v5", "v6"]);
});

it("with @added", async () => {
  await runner.compileWithCustomization(
    `
    @service
    @versioned(Versions)
    namespace My.Service {
      enum Versions { v4, v5, v6 };

      @added(Versions.v5)
      @usage(Usage.input)
      model MyModel {
        id: string;
      };
    }
  `,
    `
    @@clientApiVersions(My.Service, ClientApiVersions);
    enum ClientApiVersions { v1, v2, v3, ...My.Service.Versions };
  `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const model = sdkPackage.models[0];
  deepStrictEqual(model.apiVersions, ["v5", "v6"]);
});

it("with `api-version` flag", async () => {
  const runnerWithVersion = await createSdkTestRunner({
    "api-version": "v5",
    emitterName: "@azure-tools/typespec-python",
  });

  await runnerWithVersion.compileWithCustomization(
    `
    @service
    @versioned(Versions)
    namespace My.Service {

      enum Versions { v4, v5, v6 };
      @usage(Usage.input)
      model MyModel {
        id: string;
      };
    }
  `,
    `
    @@clientApiVersions(My.Service, ClientApiVersions);
    enum ClientApiVersions { v1, v2, v3, ...My.Service.Versions };
  `,
  );
  const sdkPackage = runnerWithVersion.context.sdkPackage;
  const apiVersionEnum = sdkPackage.enums.find((x) => x.usage & UsageFlags.ApiVersionEnum);
  ok(apiVersionEnum);
  strictEqual(apiVersionEnum.name, "ClientApiVersions");
  strictEqual(apiVersionEnum.values.length, 5);
  deepStrictEqual(
    apiVersionEnum.values.map((x) => x.name),
    ["v1", "v2", "v3", "v4", "v5"],
  );
  const model = sdkPackage.models[0];
  deepStrictEqual(model.apiVersions, ["v4", "v5"]);
});

it("with service versions defined with separate name and value", async () => {
  await runner.compileWithCustomization(
    `
    @service
    @versioned(Versions)
    namespace My.Service {

      enum Versions { 
        v2023_10_01: "2023-10-01",
        v2024_10_01: "2024-10-01",
      };
      @usage(Usage.input)
      model MyModel {
        id: string;
      };
    }
  `,
    `
    @@clientApiVersions(My.Service, ClientApiVersions);
    enum ClientApiVersions { 
      v2022_10_01: "2022-10-01",
      ...My.Service.Versions,
    };
  `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const apiVersionEnum = sdkPackage.enums.find((x) => x.usage & UsageFlags.ApiVersionEnum);
  ok(apiVersionEnum);
  strictEqual(apiVersionEnum.name, "ClientApiVersions");
  strictEqual(apiVersionEnum.values.length, 3);
  deepStrictEqual(
    apiVersionEnum.values.map((x) => x.name),
    ["v2022_10_01", "v2023_10_01", "v2024_10_01"],
  );
});

import { Namespace } from "@typespec/compiler";
import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { getDefaultApiVersion } from "../../src/public-utils.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getServiceNamespace } from "../utils.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("get single", async () => {
  await runner.compile(`
    enum Versions {
      v2022_01_01: "2022-01-01",
    }

    @versioned(Versions)
    @service
    namespace MyService {};
  `);
  const serviceNamespace = getServiceNamespace(runner);
  const defaultApiVersion = getDefaultApiVersion(runner.context, serviceNamespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "2022-01-01");
});

it("get multiple date incorrect ordering", async () => {
  await runner.compile(`
    enum Versions {
      v2022_02_01: "2022-02-01",
      v2022_02_01_PREVIEW: "2022-02-01-preview",
      v2022_01_01: "2022-01-01",
    }

    @versioned(Versions)
    @service
    @test namespace MyService {};
  `);
  const serviceNamespace = getServiceNamespace(runner);
  const defaultApiVersion = getDefaultApiVersion(runner.context, serviceNamespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "2022-01-01");
});

it("get multiple date correct ordering", async () => {
  await runner.compile(`
    enum Versions {
      v2022_01_01: "2022-01-01",
      v2022_02_01_PREVIEW: "2022-02-01-preview",
      v2022_02_01: "2022-02-01",
    }

    @versioned(Versions)
    @service
    @test namespace MyService {};
  `);
  const serviceNamespace = getServiceNamespace(runner);
  const defaultApiVersion = getDefaultApiVersion(runner.context, serviceNamespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "2022-02-01");
});

it("get multiple semantic incorrect", async () => {
  await runner.compile(`
    enum Versions {
      v1_0_0: "1.0.0",
      v1_1_0: "1.1.0",
      v1_0_1: "1.0.1",
    }

    @versioned(Versions)
    @service
    @test namespace MyService {};
  `);
  const serviceNamespace = getServiceNamespace(runner);
  const defaultApiVersion = getDefaultApiVersion(runner.context, serviceNamespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "1.0.1");
});

it("get multiple semantic correct", async () => {
  await runner.compile(`
    enum Versions {
      v1_0_0: "1.0",
      v1_0_1: "1.0.1",
      v1_1_0: "1.1.0",
    }

    @versioned(Versions)
    @service
    @test namespace MyService {};
  `);
  const serviceNamespace = getServiceNamespace(runner);
  const defaultApiVersion = getDefaultApiVersion(runner.context, serviceNamespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "1.1.0");
});

it("get undefined", async () => {
  await runner.compile(`
    @service
    @test namespace MyService {};
  `);
  const serviceNamespace = getServiceNamespace(runner);
  ok(!getDefaultApiVersion(runner.context, serviceNamespace));
});

it("get empty", async () => {
  await runner.compile(`
    enum Versions {
    }

    @versioned(Versions)
    @service
    @test namespace MyService {};
  `);
  const serviceNamespace = getServiceNamespace(runner);
  ok(!getDefaultApiVersion(runner.context, serviceNamespace));
});

it("get with all", async () => {
  const runnerWithVersion = await createSdkTestRunner({
    "api-version": "all",
    emitterName: "@azure-tools/typespec-python",
  });

  const { MyService } = await runnerWithVersion.compile(`
    enum Versions {
      v1_0_0: "1.0",
      v1_0_1: "1.0.1",
      v1_1_0: "1.1.0",
    }
    @versioned(Versions)
    @service
    @test namespace MyService {};
  `);
  const defaultApiVersion = getDefaultApiVersion(runnerWithVersion.context, MyService as Namespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "1.1.0");
});

it("get with latest", async () => {
  const runnerWithVersion = await createSdkTestRunner({
    "api-version": "latest",
    emitterName: "@azure-tools/typespec-python",
  });

  const { MyService } = await runnerWithVersion.compile(`
    enum Versions {
      v1_0_0: "1.0",
      v1_0_1: "1.0.1",
      v1_1_0: "1.1.0",
    }

    @versioned(Versions)
    @service
    @test namespace MyService {};
  `);
  const defaultApiVersion = getDefaultApiVersion(runnerWithVersion.context, MyService as Namespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "1.1.0");
});

it("get with specific version", async () => {
  const runnerWithVersion = await createSdkTestRunner({
    "api-version": "1.0.1",
    emitterName: "@azure-tools/typespec-python",
  });

  const { MyService } = await runnerWithVersion.compile(`
    enum Versions {
      v1_0_0: "1.0",
      v1_0_1: "1.0.1",
      v1_1_0: "1.1.0",
    }

    @versioned(Versions)
    @service
    @test namespace MyService {};
  `);
  const defaultApiVersion = getDefaultApiVersion(runnerWithVersion.context, MyService as Namespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "1.0.1");
});

import { Namespace } from "@typespec/compiler";
import { t } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { getDefaultApiVersion, listAllServiceNamespaces } from "../../src/public-utils.js";
import { createSdkContextForTester, SimpleTester } from "../tester.js";

it("get single", async () => {
  const { program } = await SimpleTester.compile(`
    enum Versions {
      v2022_01_01: "2022-01-01",
    }

    @versioned(Versions)
    @service
    namespace MyService {};
  `);
  const context = await createSdkContextForTester(program);
  const serviceNamespace = listAllServiceNamespaces(context)[0];
  const defaultApiVersion = getDefaultApiVersion(context, serviceNamespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "2022-01-01");
});

it("get multiple date incorrect ordering", async () => {
  const { program } = await SimpleTester.compile(`
    enum Versions {
      v2022_02_01: "2022-02-01",
      v2022_02_01_PREVIEW: "2022-02-01-preview",
      v2022_01_01: "2022-01-01",
    }

    @versioned(Versions)
    @service
    namespace MyService {};
  `);
  const context = await createSdkContextForTester(program);
  const serviceNamespace = listAllServiceNamespaces(context)[0];
  const defaultApiVersion = getDefaultApiVersion(context, serviceNamespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "2022-01-01");
});

it("get multiple date correct ordering", async () => {
  const { program } = await SimpleTester.compile(`
    enum Versions {
      v2022_01_01: "2022-01-01",
      v2022_02_01_PREVIEW: "2022-02-01-preview",
      v2022_02_01: "2022-02-01",
    }

    @versioned(Versions)
    @service
    namespace MyService {};
  `);
  const context = await createSdkContextForTester(program);
  const serviceNamespace = listAllServiceNamespaces(context)[0];
  const defaultApiVersion = getDefaultApiVersion(context, serviceNamespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "2022-02-01");
});

it("get multiple semantic incorrect", async () => {
  const { program } = await SimpleTester.compile(`
    enum Versions {
      v1_0_0: "1.0.0",
      v1_1_0: "1.1.0",
      v1_0_1: "1.0.1",
    }

    @versioned(Versions)
    @service
    namespace MyService {};
  `);
  const context = await createSdkContextForTester(program);
  const serviceNamespace = listAllServiceNamespaces(context)[0];
  const defaultApiVersion = getDefaultApiVersion(context, serviceNamespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "1.0.1");
});

it("get multiple semantic correct", async () => {
  const { program } = await SimpleTester.compile(`
    enum Versions {
      v1_0_0: "1.0",
      v1_0_1: "1.0.1",
      v1_1_0: "1.1.0",
    }

    @versioned(Versions)
    @service
    namespace MyService {};
  `);
  const context = await createSdkContextForTester(program);
  const serviceNamespace = listAllServiceNamespaces(context)[0];
  const defaultApiVersion = getDefaultApiVersion(context, serviceNamespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "1.1.0");
});

it("get undefined", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace MyService {};
  `);
  const context = await createSdkContextForTester(program);
  const serviceNamespace = listAllServiceNamespaces(context)[0];
  ok(!getDefaultApiVersion(context, serviceNamespace));
});

it("get empty", async () => {
  const { program } = await SimpleTester.compile(`
    enum Versions {
    }

    @versioned(Versions)
    @service
    namespace MyService {};
  `);
  const context = await createSdkContextForTester(program);
  const serviceNamespace = listAllServiceNamespaces(context)[0];
  ok(!getDefaultApiVersion(context, serviceNamespace));
});

it("get with all", async () => {
  const { program, MyService } = await SimpleTester.compile(t.code`
    enum Versions {
      v1_0_0: "1.0",
      v1_0_1: "1.0.1",
      v1_1_0: "1.1.0",
    }
    @versioned(Versions)
    @service
    namespace ${t.namespace("MyService")} {};
  `);
  const context = await createSdkContextForTester(program, {
    "api-version": "all",
  });
  const defaultApiVersion = getDefaultApiVersion(context, MyService as Namespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "1.1.0");
});

it("get with latest", async () => {
  const { program, MyService } = await SimpleTester.compile(t.code`
    enum Versions {
      v1_0_0: "1.0",
      v1_0_1: "1.0.1",
      v1_1_0: "1.1.0",
    }

    @versioned(Versions)
    @service
    namespace ${t.namespace("MyService")} {};
  `);
  const context = await createSdkContextForTester(program, {
    "api-version": "latest",
  });
  const defaultApiVersion = getDefaultApiVersion(context, MyService as Namespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "1.1.0");
});

it("get with specific version", async () => {
  const { program, MyService } = await SimpleTester.compile(t.code`
    enum Versions {
      v1_0_0: "1.0",
      v1_0_1: "1.0.1",
      v1_1_0: "1.1.0",
    }

    @versioned(Versions)
    @service
    namespace ${t.namespace("MyService")} {};
  `);
  const context = await createSdkContextForTester(program, {
    "api-version": "1.0.1",
  });
  const defaultApiVersion = getDefaultApiVersion(context, MyService as Namespace);
  ok(defaultApiVersion);
  strictEqual(defaultApiVersion.value, "1.0.1");
});

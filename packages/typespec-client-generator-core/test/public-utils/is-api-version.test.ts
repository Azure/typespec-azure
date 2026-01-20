import { ignoreDiagnostics } from "@typespec/compiler";
import { t } from "@typespec/compiler/testing";
import { getHttpOperation, getServers } from "@typespec/http";
import { ok } from "assert";
import { it } from "vitest";
import { isApiVersion, listAllServiceNamespaces } from "../../src/public-utils.js";
import { createSdkContextForTester, SimpleTester, VersionedServiceTester } from "../tester.js";

it("is api version query", async () => {
  const { program, func } = await VersionedServiceTester.compile(t.code`
    op ${t.op("func")}(@query("api-version") myApiVersion: string): void;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });

  const queryParam = ignoreDiagnostics(getHttpOperation(context.program, func)).parameters
    .parameters[0];
  ok(isApiVersion(context, queryParam.param));
});

it("is api version path", async () => {
  const { program, func } = await VersionedServiceTester.compile(t.code`
    op ${t.op("func")}(@path apiVersion: string): void;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });

  const pathParam = ignoreDiagnostics(getHttpOperation(context.program, func)).parameters
    .parameters[0];
  ok(isApiVersion(context, pathParam.param));
});

it("not api version param", async () => {
  const { program, func } = await SimpleTester.compile(t.code`
    op ${t.op("func")}(@path foo: string): void;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });

  const pathParam = ignoreDiagnostics(getHttpOperation(context.program, func)).parameters
    .parameters[0];
  ok(!isApiVersion(context, pathParam.param));
});

it("api version in host param", async () => {
  const { program } = await SimpleTester.compile(`
    @service(#{
      title: "ApiVersion",
    })
    @server(
      "{endpoint}/{ApiVersion}",
      "Api Version",
      {
        endpoint: string,

        @doc("Api Version")
        @path
        ApiVersion: APIVersions,
      }
    )
    @versioned(APIVersions)
    namespace MyService;
    enum APIVersions {
      v1_0: "v1.0",
    }
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const serviceNamespace = listAllServiceNamespaces(context)[0];
  const server = getServers(context.program, serviceNamespace)?.[0];
  const hostParam = server?.parameters.get("ApiVersion");

  ok(hostParam && isApiVersion(context, hostParam));
});

it("api version in host param with versioning", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    @versioned(Versions)
    @server(
      "{endpoint}/test/api-version:{version}",
      "Testserver endpoint",
      {
        endpoint: url,
        version: Versions,
      }
    )
    namespace Test;

    enum Versions {
      v1: "v1",
      v2: "v2",
    }
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const serviceNamespace = listAllServiceNamespaces(context)[0];
  const server = getServers(context.program, serviceNamespace)?.[0];
  const hostParam = server?.parameters.get("version");

  ok(hostParam && isApiVersion(context, hostParam));
});

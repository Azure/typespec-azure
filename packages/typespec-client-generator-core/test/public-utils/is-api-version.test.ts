import { ignoreDiagnostics } from "@typespec/compiler";
import { t } from "@typespec/compiler/testing";
import { getHttpOperation, getServers } from "@typespec/http";
import { ok } from "assert";
import { it } from "vitest";
import { isApiVersion, listAllServiceNamespaces } from "../../src/public-utils.js";
import {
  createSdkContextForTester,
  SimpleTester,
  SimpleTesterWithVersionedService,
} from "../tester.js";

it("is api version query", async () => {
  const { program, func } = await SimpleTesterWithVersionedService.compile(t.code`
    op ${t.op("func")}(@query("api-version") myApiVersion: string): void;
  `);
  const context = await createSdkContextForTester(program);

  const queryParam = ignoreDiagnostics(getHttpOperation(context.program, func)).parameters
    .parameters[0];
  ok(isApiVersion(context, queryParam.param));
});

it("is api version path", async () => {
  const { program, func } = await SimpleTesterWithVersionedService.compile(t.code`
    op ${t.op("func")}(@path apiVersion: string): void;
  `);
  const context = await createSdkContextForTester(program);

  const pathParam = ignoreDiagnostics(getHttpOperation(context.program, func)).parameters
    .parameters[0];
  ok(isApiVersion(context, pathParam.param));
});

it("not api version param", async () => {
  const { program, func } = await SimpleTester.compile(t.code`
    op ${t.op("func")}(@path foo: string): void;
  `);
  const context = await createSdkContextForTester(program);

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
  const context = await createSdkContextForTester(program);
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
  const context = await createSdkContextForTester(program);
  const serviceNamespace = listAllServiceNamespaces(context)[0];
  const server = getServers(context.program, serviceNamespace)?.[0];
  const hostParam = server?.parameters.get("version");

  ok(hostParam && isApiVersion(context, hostParam));
});

it("api version in host param named api-version with plain string type in versioned service", async () => {
  // Regression test: server URL template param named `apiVersion` with plain string type
  // (not the version enum) in a versioned service must still be recognized as an API
  // version parameter.  This was broken by PR #4341 which added an isMetadata guard that
  // excluded server URL template params because they carry no HTTP metadata annotations.
  // See https://github.com/Azure/typespec-azure/blob/main/packages/azure-http-specs/specs/resiliency/srv-driven/old.tsp
  const { program } = await SimpleTester.compile(`
    @service
    @versioned(Versions)
    @server(
      "{endpoint}/resiliency/service-driven/client:v1/service:{serviceDeploymentVersion}/api-version:{apiVersion}",
      "Testserver endpoint",
      {
        endpoint: url,
        serviceDeploymentVersion: string,
        apiVersion: string,
      }
    )
    namespace Resiliency.ServiceDriven;

    enum Versions {
      v1,
    }
  `);
  const context = await createSdkContextForTester(program);
  const serviceNamespace = listAllServiceNamespaces(context)[0];
  const server = getServers(context.program, serviceNamespace)?.[0];
  const apiVersionParam = server?.parameters.get("apiVersion");

  ok(apiVersionParam && isApiVersion(context, apiVersionParam));
});
